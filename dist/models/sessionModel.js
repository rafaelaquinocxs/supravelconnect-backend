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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["SCHEDULED"] = "scheduled";
    SessionStatus["IN_PROGRESS"] = "in-progress";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["CANCELLED"] = "cancelled";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
const sessionSchema = new mongoose_1.Schema({
    client: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    technician: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialty: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Specialty',
        required: true
    },
    problem: {
        type: String,
        required: true
    },
    urgency: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: Object.values(SessionStatus),
        default: SessionStatus.SCHEDULED
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number
    },
    creditsUsed: {
        type: Number
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String
    },
    recordingUrl: {
        type: String
    }
}, {
    timestamps: true
});
const Session = mongoose_1.default.model('Session', sessionSchema);
exports.default = Session;
