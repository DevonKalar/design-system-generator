import {
  createDesignSystemRequestSchema,
  designSystemIdSchema,
  updateDesignSystemRequestSchema,
} from '@dsg/contracts';
import { ZipArchive } from 'archiver';
import { Router } from 'express';
import { parseOrThrow } from '../../lib/validate.js';
import { authenticatedUserId, requireAuth } from '../../middleware/require-auth.js';
import * as service from './service.js';

export const designSystemsRouter = Router();

// Applies to every route below — there is no unauthenticated read path for a design system.
designSystemsRouter.use(requireAuth);

designSystemsRouter.get('/', async (req, res) => {
  res.json(await service.listForOwner(authenticatedUserId(req)));
});

designSystemsRouter.post('/', async (req, res) => {
  const body = parseOrThrow(createDesignSystemRequestSchema, req.body, 'Request body');
  const created = await service.createForOwner(authenticatedUserId(req), body.name);

  res.status(201).json(created);
});

designSystemsRouter.get('/:id', async (req, res) => {
  const id = parseOrThrow(designSystemIdSchema, req.params.id, 'Design system id');

  res.json(await service.getForOwner(id, authenticatedUserId(req)));
});

designSystemsRouter.patch('/:id', async (req, res) => {
  const id = parseOrThrow(designSystemIdSchema, req.params.id, 'Design system id');
  const patch = parseOrThrow(updateDesignSystemRequestSchema, req.body, 'Request body');

  res.json(await service.updateForOwner(id, authenticatedUserId(req), patch));
});

designSystemsRouter.delete('/:id', async (req, res) => {
  const id = parseOrThrow(designSystemIdSchema, req.params.id, 'Design system id');
  await service.deleteForOwner(id, authenticatedUserId(req));

  res.status(204).end();
});

designSystemsRouter.get('/:id/export.zip', async (req, res) => {
  const id = parseOrThrow(designSystemIdSchema, req.params.id, 'Design system id');
  const bundle = await service.exportForOwner(id, authenticatedUserId(req));

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${bundle.slug}.zip"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  // Headers are already sent by the time the archive streams, so a late failure cannot be
  // turned into a JSON error response — destroy the connection instead of trailing garbage
  // onto a partial zip.
  archive.on('error', () => res.destroy());
  archive.pipe(res);

  for (const file of bundle.files) {
    archive.append(file.contents, { name: file.path });
  }

  await archive.finalize();
});
