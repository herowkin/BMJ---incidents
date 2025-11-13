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

  //Non admin users can only see their own incidents
  if (req.user?.role !== ROLES.ADMIN) {
    filter.createdBy = req.user._id;
  }

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

  //Only creator or admin can view this incident
  const createdById = item.createdBy && item.createdBy._id ? String(item.createdBy._id) : String(item.createdBy);
  if (req.user?.role !== ROLES.ADMIN && createdById !== String(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

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

  //Only ADMIN users may perform assignment/edit operations
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  //Admins may assign unassigned incidents to themselves. They may only edit incidents assigned to them.
  const wasUnassigned = !incident.assignedTo;

  //Handle assignment first (if provided)
  if (req.body.assignedTo !== undefined) {
    if (!wasUnassigned) {
      return res.status(400).json({ message: 'Incident already assigned' });
    }
    //Allow only assigning to self
    if (String(req.body.assignedTo) !== String(req.user._id) && String(req.body.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Admins may only assign incidents to themselves' });
    }
    incident.assignedTo = req.user._id;
  }

  // After potential assignment, require that the incident is assigned to this admin for any other edits
  const assignedId = incident.assignedTo && (incident.assignedTo._id || incident.assignedTo);
  if (!assignedId || String(assignedId) !== String(req.user._id) && String(assignedId) !== String(req.user.id)) {
    // If admin attempted only to assign (no other fields), that's allowed (we handled above). Otherwise forbid edits.
    const otherFields = ['priority', 'category', 'description', 'title', 'status'];
    const wantsToEditOther = otherFields.some((k) => req.body[k] !== undefined);
    if (wantsToEditOther) {
      return res.status(403).json({ message: 'Admins may only edit incidents assigned to them' });
    }
  }

  // Now apply allowed edits for admins assigned to this incident
  const updatable = ['priority', 'category', 'description', 'title', 'status'];
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
