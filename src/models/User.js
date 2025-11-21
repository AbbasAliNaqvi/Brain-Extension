const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  device: {
    type: String,
  },
  ip: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const cognitiveProfileSchema = new mongoose.Schema({
  learnningStyle: {
    type: String,
    enum: [
      "Visual",
      "Auditory",
      "Kinesthetic",
      "Reading/Writing",
      "Multimodal",
      "balanced",
    ],
    default: "balanced",
  },
  reasoningStyle: {
    type: String,
    enum: [
      "Analytical",
      "Holistic",
      "Practical",
      "Creative",
      "balanced",
      "direct",
    ],
    default: "direct",
  },
  interests: {
    type: [String],
    default: [],
  },
  difficultyAreas: {
    type: [String],
    default: [],
  },
});

const settingsSchema = new mongoose.Schema({
  memoryEnabled: {
    type: Boolean,
    default: true,
  },
  visionEnabled: {
    type: Boolean,
    default: false,
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  reasoningEnabled: {
    type: Boolean,
    default: true,
  },
  autoTagging: {
    type: Boolean,
    default: true,
  },
  personalizedLLM: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: "https://avatar.iran.liara.run/public",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokens: [refreshTokenSchema],
    roles: {
      type: [String],
      default: ["user"],
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
    cognitiveProfile: {
      type: cognitiveProfileSchema,
      default: () => ({}),
    },
    analytics: {
      totalMemories: {
        type: Number,
        default: 0,
      },
      totalFiles: {
        type: Number,
        default: 0,
      },
      lastLogin: Date,
      streakDays: {
        type: Number,
        default: 0,
      },
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);