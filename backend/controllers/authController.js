exports.login = (req, res) => {
  const { username, password } = req.body;
  
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    // In a real app we'd use JWT. A simple token for local use:
    return res.json({ token: 'dashboard_auth_token_88291', username });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
};
