const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: (decoded.id ?? decoded._id).toString(),  // ← handles both cases
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

