/**
 * EMB Consulting — Backend API
 * Node.js + Express + MongoDB
 *
 * Installation :
 *   npm install express mongoose cors dotenv
 *
 * Lancement :
 *   node server.js
 *
 * Variables d'environnement (.env) :
 *   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/emb
 *   ADMIN_PASSWORD=votre_mot_de_passe_admin
 *   PORT=3001
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────
app.use(cors({
  origin: '*', // Restreindre en prod : ['https://emb-consulting.fr']
  methods: ['GET', 'POST', 'PATCH'],
}));
app.use(express.json());

// ── MongoDB Connection ────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/emb')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// ── Schema ────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  nom:        { type: String, required: true, trim: true },
  entreprise: { type: String, trim: true, default: '' },
  email:      { type: String, required: true, trim: true, lowercase: true },
  telephone:  { type: String, trim: true, default: '' },
  budget:     { type: String, default: '' },
  mission:    { type: String, default: '' },
  message:    { type: String, required: true },
  statut:     { type: String, enum: ['nouveau', 'lu', 'en_traitement', 'clôturé'], default: 'nouveau' },
  cree_le:    { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// ── Middleware Auth Admin ─────────────────────────────
function authAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (!pwd || pwd !== (process.env.ADMIN_PASSWORD || 'admin1234')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// ── Routes ────────────────────────────────────────────

// POST /api/contact — Envoi d'un message depuis le formulaire public
app.post('/api/contact', async (req, res) => {
  const { nom, entreprise, email, telephone, budget, mission, message } = req.body;
  if (!nom || !email || !message) {
    return res.status(400).json({ error: 'Champs requis manquants : nom, email, message' });
  }
  // Validation email basique
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }
  try {
    const doc = await Message.create({ nom, entreprise, email, telephone, budget, mission, message });
    res.status(201).json({ success: true, id: doc._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/messages — Liste des messages (admin)
app.get('/api/admin/messages', authAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ cree_le: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/admin/messages/:id — Mettre à jour le statut
app.patch('/api/admin/messages/:id', authAdmin, async (req, res) => {
  try {
    const { statut } = req.body;
    const doc = await Message.findByIdAndUpdate(req.params.id, { statut }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Message introuvable' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Serveur EMB démarré sur http://localhost:${PORT}`);
});
