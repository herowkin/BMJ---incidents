import Incident from '../models/Incident.js';
import { ROLES } from '../utils/roles.js';

export const listIncidents = async (req, res) => {
  const { page = 1, limit = 10, status, priority, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) filter.$or = [
    { title: { $regex: q, $options: 'i' } },
    { description: { $regex: q, $options: 'i' } },
  ];

  const [items, total] = await Promise.all([
    Incident.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
    Incident.countDocuments(filter),
  ]);

  res.json({ page: +page, limit: +limit, total, items });
};

export const getIncident = async (req, res) => {
  const item = await Incident.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email');
  if (!item) return res.status(404).json({ message: 'Incident not found' });
  res.json(item);
};

export const createIncident = async (req, res) => {
  const { title, description, category, priority, assignedTo } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'title and description required' });

  const incident = await Incident.create({
    title,
    description,
    category,
    priority,
    createdBy: req.user._id,
    assignedTo: assignedTo || null,
  });

  const populated = await incident.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'assignedTo', select: 'name email' },
  ]);

  res.status(201).json(populated);
};

export const updateIncident = async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });

  // Only creator or admin can update
  const isOwner = incident.createdBy.equals(req.user._id);
  if (!(isOwner || req.user.role === ROLES.ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const updatable = ['title', 'description', 'category', 'status', 'priority', 'assignedTo'];
  updatable.forEach((k) => {
    if (req.body[k] !== undefined) incident[k] = req.body[k];
  });
  await incident.save();
  const populated = await incident.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'assignedTo', select: 'name email' },
  ]);
  res.json(populated);
};

export const deleteIncident = async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });

  const isOwner = incident.createdBy.equals(req.user._id);
  if (!(isOwner || req.user.role === ROLES.ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await incident.deleteOne();
  res.json({ message: 'Incident deleted' });
};
