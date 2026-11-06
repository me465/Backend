const { User, Otp, Business, Subscription } = require('../models');
const jwt = require('jsonwebtoken');
const { generateOTP, hashOTP, verifyOTP: checkOtpHash, sendSMS } = require('../utils/otpService');
const { sendOtpEmail } = require('../utils/emailService');
const { Op } = require('sequelize');

const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('FATAL: JWT_SECRET manquant dans les variables d\'environnement');
    }
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            plan: user.plan,
            businessId: user.businessId || user.Business?.id || null
        },
        secret,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '30d'
        }
    );
};

const sanitizeUser = (user, business = null) => {
    if (!user) return null;
    const plain = user.toJSON ? user.toJSON() : { ...user };
    delete plain.password;
    delete plain.otp;
    delete plain.otpExpires;
    
    if (business) {
        plain.business = business.toJSON ? business.toJSON() : business;
    }
    return plain;
};

exports.register = async (req, res) => {
    try {
        const { name, email, phone, password, role, plan, managerId, companyName } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'L\'adresse e-mail est requise' });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({
                code: "INVALID_PASSWORD",
                message: 'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.'
            });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(409).json({
                code: "EMAIL_ALREADY_EXISTS",
                message: 'Cet e-mail est déjà utilisé.'
            });
        }

        const selectedPlan = plan || 'foyer';
        const computedRole = role ? role : (selectedPlan === 'business' ? 'OWNER' : 'FOYER');
        const now = new Date();
        const trialEndsAt = selectedPlan === 'business' ? new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000) : null;
        const subscriptionStatus = selectedPlan === 'business' ? 'trial' : 'none';

        // 1. Créer le User
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: computedRole,
            plan: selectedPlan,
            subscriptionStatus,
            trialEndsAt,
            businessId: null,
            managerId,
            companyName
        });

        // 2. Créer le Business si applicable
        let businessId = null;
        let createdBusiness = null;
        if (selectedPlan === 'business' || computedRole === 'OWNER') {
            createdBusiness = await Business.create({
                nom: companyName || `${name}'s Business`,
                plan: selectedPlan,
                subscriptionStatus,
                trialEndsAt,
                proprietaireId: user.id
            });
            businessId = createdBusiness.id;

            user.businessId = businessId;
            await user.save();

            await Subscription.create({
                userId: user.id,
                businessId: createdBusiness.id,
                plan: 'business',
                type: 'trial',
                paymentMethod: 'free_trial',
                montant: 0,
                devise: 'FCFA',
                durationMonths: 1,
                status: 'active',
                startDate: now,
                endDate: trialEndsAt,
                transactionReference: `TRIAL-${Date.now()}`
            });
        }

        // 3. Génération et envoi de l'OTP sécurisé (haché dans la table Otp)
        const otp = generateOTP();
        const code_hash = await hashOTP(otp);
        const expiration_time = new Date(Date.now() + OTP_EXPIRATION_MS);

        await Otp.destroy({ where: { email } });
        await Otp.create({
            email,
            code_hash,
            expiration_time,
            used: false,
            attempts: 0
        });

        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error("Erreur lors de l'envoi de l'OTP après inscription:", emailError);
        }

        const targetRedirect = user.plan === 'business' ? '/business' : '/budget';

        res.status(201).json({
            message: 'Utilisateur créé avec succès. Un code OTP a été envoyé.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                subscriptionStatus: user.subscriptionStatus,
                trialEndsAt: user.trialEndsAt,
                companyName: user.companyName,
                managerId: user.managerId,
                businessId: user.businessId,
                targetRedirect
            },
            targetRedirect
        });
    } catch (error) {
        console.error('[register] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'E-mail et mot de passe requis' });
        }

        const user = await User.findOne({
            where: { email },
            include: [{ model: Business }]
        });

        if (!user || !user.actif) {
            return res.status(401).json({ message: 'E-mail ou mot de passe invalide' });
        }

        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: 'E-mail ou mot de passe invalide',
                allowPasswordReset: true
            });
        }

        const now = new Date();
        const trialEndsAtDate = user.trialEndsAt || user.Business?.trialEndsAt;
        const subEndsAtDate = user.subscriptionEndsAt || user.Business?.subscriptionEndsAt;
        const hasBusinessAccess = (user.plan === 'business' || !!user.Business) && (
            (trialEndsAtDate && new Date(trialEndsAtDate) > now) ||
            (subEndsAtDate && new Date(subEndsAtDate) > now)
        );
        const membershipState = hasBusinessAccess ? 'FOYER_BUSINESS' : (user.plan === 'business' ? 'BUSINESS' : 'FOYER');
        const targetRedirect = hasBusinessAccess ? '/business' : '/budget';

        res.json({
            message: 'Connexion réussie',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                plan: user.plan,
                membershipState,
                hasFoyerAccess: true,
                hasBusinessAccess,
                subscriptionStatus: user.subscriptionStatus,
                trialEndsAt: user.trialEndsAt,
                subscriptionEndsAt: user.subscriptionEndsAt,
                business: user.Business,
                businessId: user.businessId,
                companyName: user.companyName,
                managerId: user.managerId,
                targetRedirect
            },
            targetRedirect,
            token: generateToken(user)
        });
    } catch (error) {
        console.error('[login] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, phone, otp } = req.body;

        if ((!email && !phone) || !otp) {
            return res.status(400).json({ message: 'L\'identifiant (e-mail ou téléphone) et le code OTP sont requis' });
        }

        const identifierCondition = email ? { email } : { phone };

        const otpRecord = await Otp.findOne({
            where: {
                ...identifierCondition,
                used: false,
                expiration_time: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']]
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Code OTP invalide ou expiré' });
        }

        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(400).json({ message: 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code OTP.' });
        }

        const isValid = await checkOtpHash(otp, otpRecord.code_hash);

        if (!isValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
            return res.status(400).json({ 
                message: remaining > 0 
                    ? `Code OTP incorrect. ${remaining} tentative(s) restante(s).` 
                    : 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code OTP.' 
            });
        }

        // Marquer comme utilisé immédiatement pour garantir l'usage unique
        otpRecord.used = true;
        await otpRecord.save();

        let user = null;
        if (email) {
            user = await User.findOne({
                where: { email },
                include: [{ model: Business }]
            });
        } else if (phone) {
            user = await User.findOne({
                where: { phone },
                include: [{ model: Business }]
            });
        }

        if (user) {
            const targetRedirect = user.plan === 'business' ? '/business' : '/budget';
            return res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    plan: user.plan,
                    subscriptionStatus: user.subscriptionStatus,
                    trialEndsAt: user.trialEndsAt,
                    subscriptionEndsAt: user.subscriptionEndsAt,
                    business: user.Business,
                    businessId: user.businessId,
                    managerId: user.managerId,
                    targetRedirect
                },
                targetRedirect,
                token: generateToken(user),
                message: 'Authentification réussie'
            });
        }

        res.json({
            message: 'Code OTP vérifié avec succès',
            email,
            phone
        });
    } catch (error) {
        console.error('[verifyOTP] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const identifier = email || phone;
        if (!identifier) {
            return res.status(400).json({ message: 'L\'adresse e-mail ou le numéro de téléphone est requis' });
        }

        let user = null;
        if (email) {
            user = await User.findOne({ where: { email } });
        } else if (phone) {
            user = await User.findOne({ where: { phone } });
        }

        const otp = generateOTP();
        const code_hash = await hashOTP(otp);
        const expiration_time = new Date(Date.now() + OTP_EXPIRATION_MS);

        if (email) {
            await Otp.destroy({ where: { email } });
            await Otp.create({
                email,
                code_hash,
                expiration_time,
                used: false,
                attempts: 0
            });
            await sendOtpEmail(email, otp);
        } else if (phone) {
            await Otp.destroy({ where: { phone } });
            await Otp.create({
                phone,
                code_hash,
                expiration_time,
                used: false,
                attempts: 0
            });
            await sendSMS(phone, otp);
        }

        res.json({
            message: 'Code OTP envoyé avec succès.',
            email: email || (user ? user.email : undefined),
            phone: phone || (user ? user.phone : undefined),
            isExistingUser: !!user
        });
    } catch (error) {
        console.error('[sendOTP] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { email, userId, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
        }

        let user;
        if (req.user?.id) {
            user = await User.findByPk(req.user.id);
        } else if (userId) {
            user = await User.findByPk(userId);
        } else if (email) {
            user = await User.findOne({ where: { email } });
        }

        if (user) {
            user.password = newPassword;
            await user.save();
            res.json({ success: true, message: 'Mot de passe modifié avec succès' });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('[changePassword] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.sendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'L\'adresse e-mail est requise' });
        }

        const user = await User.findOne({ where: { email } });

        await Otp.destroy({ where: { email } });

        const otp = generateOTP();
        const code_hash = await hashOTP(otp);
        const expiration_time = new Date(Date.now() + OTP_EXPIRATION_MS);

        await Otp.create({
            email,
            code_hash,
            expiration_time,
            used: false,
            attempts: 0
        });

        await sendOtpEmail(email, otp);

        res.json({
            message: 'Code OTP envoyé par e-mail.',
            isExistingUser: !!user
        });
    } catch (error) {
        console.error('[sendEmailOTP] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'E-mail et code OTP requis' });
        }

        const otpRecord = await Otp.findOne({
            where: {
                email,
                used: false,
                expiration_time: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']]
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Code OTP invalide ou expiré' });
        }

        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(400).json({ message: 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code OTP.' });
        }

        const isValid = await checkOtpHash(otp, otpRecord.code_hash);

        if (!isValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
            return res.status(400).json({ 
                message: remaining > 0 
                    ? `Code OTP incorrect. ${remaining} tentative(s) restante(s).` 
                    : 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code OTP.' 
            });
        }

        otpRecord.used = true;
        await otpRecord.save();

        let user = await User.findOne({
            where: { email },
            include: [{ model: Business }]
        });

        if (user) {
            const targetRedirect = user.plan === 'business' ? '/business' : '/budget';
            return res.json({
                message: 'Code OTP vérifié avec succès',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                    business: user.Business,
                    businessId: user.businessId,
                    targetRedirect
                },
                token: generateToken(user),
                targetRedirect
            });
        }

        res.json({
            message: 'Code OTP vérifié avec succès',
            email
        });
    } catch (error) {
        console.error('[verifyEmailOTP] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
};
