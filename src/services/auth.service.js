const bcrypt = require("bcryptjs");

const User = require("../models/User");
const {
    generateAccessToken,
    generateRefreshToken,
} = require("../utils/jwt");

const SALT_ROUNDS = 10;

function sanitizeUser(
    user
){
    const obj = user.toObject();
    delete obj.password;
    delete obj.refreshTokens;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    return obj;
}

// SIGNUP
exports.signup = async ( {
    name,
    email,
    password,
    avatarUrl,
    device,
    ip
}) => {
    const exists = await User.findOne({ email });
    if (exists) throw { status: 400, message: "Email already in use"};
    const user = await User.create({
        name,
        email,
        password: password,
        avatarUrl,
    });
    const accessToken = generateAccessToken({ userId : user._id });
    const refreshToken = generateRefreshToken();
    user.refreshTokens.push({
        token: refreshToken,
        device,
        ip,
    });
    await user.save();
    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
    };
};

// LOGIN
exports.login = async ({
    email,
    password,
    device,
    ip
}) => {
    const user = await User.findOne({ email });
    
    if (!user) {
        throw {
            status: 400,
            message: "User Not Found"
        };
    }

    const match = await user.matchPassword(password);
    
    if (!match) {
        throw { 
            status: 401, 
            message: "Invalid Credentials" 
        };
    }

    const accessToken = generateAccessToken({ 
        userId: user._id 
    });
    const refreshToken = generateRefreshToken();

    user.refreshTokens.push({
        token: refreshToken,
        device,
        ip,
    });
    
    user.analytics.lastLogin = new Date();
    await user.save();

    return {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
    };
};

// REFRESH TOKEN
exports.refresh = async ({
    refreshToken
})=> {
    const user = await User.findOne({
        "refreshTokens.token": refreshToken
    });
    if (!user)
        throw {
            status: 401,
            message: "Invalid refresh token"
        };
    
    const newRefresh = generateRefreshToken();
    user.refreshTokens = user.refreshTokens.filter((t)=> t.token !== refreshToken);
    user.refreshTokens.push({
        token: newRefresh
    });
    await user.save();

    const accessToken = generateAccessToken({
        userId: user._id
    });

    return {
        accessToken,
        refreshToken: newRefresh,
        user: sanitizeUser(user),
    };
};

// LOGOUT
exports.logout = async ({
    refreshToken
}) => {
    await User.updateOne({
        "refreshTokens.token": refreshToken
    },
    { 
        $pull: {
            refreshTokens: {
                token: refreshToken
            }
        }
    }
);
};