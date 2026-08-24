/**
 * simulation/simulation.router.ts
 *
 * Routes for /api/simulation (DEVELOPMENT ONLY).
 */

import { Router } from 'express';
import { SimulationController } from './simulation.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const simulationRouter = Router();

simulationRouter.get('/status', asyncHandler(SimulationController.getStatus));
simulationRouter.post('/inject', asyncHandler(SimulationController.injectFault));
simulationRouter.post('/reset', asyncHandler(SimulationController.resetFaults));
simulationRouter.post('/run-scenario', asyncHandler(SimulationController.runScenario));
