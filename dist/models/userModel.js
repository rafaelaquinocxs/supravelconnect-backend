"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = exports.Technician = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["TECHNICIAN"] = "technician";
    UserRole["CLIENT"] = "client";
})(UserRole || (exports.UserRole = UserRole = {}));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor, informe um email válido']
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [6, 'A senha deve ter pelo menos 6 caracteres']
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.CLIENT
    },
    profileImage: {
        type: String
    },
    phone: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    discriminatorKey: 'role'
});
// Método para comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Modelo base de usuário
const User = mongoose_1.default.model('User', userSchema);
// Esquema específico para técnicos
const technicianSchema = new mongoose_1.Schema({
    specialties: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Specialty'
        }],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    available: {
        type: Boolean,
        default: false
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
    description: {
        type: String
    },
    location: {
        type: String
    },
    isApproved: {
        type: Boolean,
        default: false
    }
});
// Esquema específico para clientes
const clientSchema = new mongoose_1.Schema({
    company: {
        type: String
    },
    credits: {
        type: Number,
        default: 0
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'cancelled'],
        default: 'inactive'
    },
    subscriptionId: {
        type: String
    }
});
// Criar modelos discriminados
exports.Technician = User.discriminator('technician', technicianSchema);
exports.Client = User.discriminator('client', clientSchema);
exports.default = User;
