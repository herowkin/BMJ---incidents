import { Router } from 'express';
import {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
} from '../controllers/incidentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', listIncidents);
router.get('/:id', getIncident);
router.post('/', createIncident);
router.patch('/:id', updateIncident);
router.delete('/:id', deleteIncident);

export default router;
