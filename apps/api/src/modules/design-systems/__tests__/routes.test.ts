import { createDefaultDefinition } from '@dsg/contracts';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { authHeader, createTestUser } from '../../../__tests__/helpers.js';

const app = createApp();

let auth: string;
let ownerId: string;

beforeEach(async () => {
  const user = await createTestUser();
  ownerId = user.id;
  auth = await authHeader(ownerId);
});

async function createSystem(name: string, header = auth) {
  const response = await request(app)
    .post('/api/design-systems')
    .set('Authorization', header)
    .send({ name });

  expect(response.status).toBe(201);
  return response.body;
}

describe('authentication', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/design-systems');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthorized');
  });

  it('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/design-systems')
      .set('Authorization', 'Bearer not-a-real-jwt');

    expect(response.status).toBe(401);
  });

  it('rejects a token that is not a Bearer token', async () => {
    const response = await request(app)
      .get('/api/design-systems')
      .set('Authorization', 'Basic abc123');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/design-systems', () => {
  it('creates a system seeded with the default definition', async () => {
    const created = await createSystem('Acme Design');

    expect(created.name).toBe('Acme Design');
    expect(created.slug).toBe('acme-design');
    expect(created.schemaVersion).toBe(1);
    expect(created.definition).toEqual(createDefaultDefinition());
  });

  it('rejects an empty name with field-level detail', async () => {
    const response = await request(app)
      .post('/api/design-systems')
      .set('Authorization', auth)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
    expect(response.body.error.details[0].path).toBe('name');
  });

  it('disambiguates a slug that collides within the same owner', async () => {
    const first = await createSystem('Acme');
    const second = await createSystem('Acme');
    const third = await createSystem('Acme');

    expect([first.slug, second.slug, third.slug]).toEqual(['acme', 'acme-2', 'acme-3']);
  });

  it('lets different owners hold the same slug', async () => {
    const other = await createTestUser();
    const otherAuth = await authHeader(other.id);

    const mine = await createSystem('Acme');
    const theirs = await createSystem('Acme', otherAuth);

    expect(mine.slug).toBe('acme');
    expect(theirs.slug).toBe('acme');
  });

  it('falls back to a usable slug when the name has no slug-safe characters', async () => {
    const created = await createSystem('!!!');

    expect(created.slug).toBe('design-system');
  });
});

describe('GET /api/design-systems', () => {
  it('returns only the requesting user’s systems', async () => {
    const other = await createTestUser();
    const otherAuth = await authHeader(other.id);

    await createSystem('Mine');
    await createSystem('Theirs', otherAuth);

    const response = await request(app).get('/api/design-systems').set('Authorization', auth);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Mine');
  });

  it('returns most recently updated first', async () => {
    const first = await createSystem('First');
    await createSystem('Second');

    await request(app)
      .patch(`/api/design-systems/${first.id}`)
      .set('Authorization', auth)
      .send({ name: 'First Updated' });

    const response = await request(app).get('/api/design-systems').set('Authorization', auth);

    expect(response.body.map((system: { name: string }) => system.name)).toEqual([
      'First Updated',
      'Second',
    ]);
  });
});

describe('GET /api/design-systems/:id', () => {
  it('returns the full definition', async () => {
    const created = await createSystem('Acme');

    const response = await request(app)
      .get(`/api/design-systems/${created.id}`)
      .set('Authorization', auth);

    expect(response.status).toBe(200);
    expect(response.body.definition.colors.palettes[0].name).toBe('brand');
  });

  it('404s on another owner’s system rather than revealing that it exists', async () => {
    const other = await createTestUser();
    const theirs = await createSystem('Theirs', await authHeader(other.id));

    const response = await request(app)
      .get(`/api/design-systems/${theirs.id}`)
      .set('Authorization', auth);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });

  it('400s on a non-uuid id', async () => {
    const response = await request(app)
      .get('/api/design-systems/not-a-uuid')
      .set('Authorization', auth);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/design-systems/:id', () => {
  it('replaces the definition', async () => {
    const created = await createSystem('Acme');
    const definition = createDefaultDefinition();
    definition.typography.baseSizePx = 18;

    const response = await request(app)
      .patch(`/api/design-systems/${created.id}`)
      .set('Authorization', auth)
      .send({ definition });

    expect(response.status).toBe(200);
    expect(response.body.definition.typography.baseSizePx).toBe(18);
  });

  it('re-slugs on rename', async () => {
    const created = await createSystem('Acme');

    const response = await request(app)
      .patch(`/api/design-systems/${created.id}`)
      .set('Authorization', auth)
      .send({ name: 'Globex Design' });

    expect(response.body.slug).toBe('globex-design');
  });

  it('keeps its own slug when renamed to the same name', async () => {
    const created = await createSystem('Acme');

    const response = await request(app)
      .patch(`/api/design-systems/${created.id}`)
      .set('Authorization', auth)
      .send({ name: 'Acme' });

    expect(response.body.slug).toBe('acme');
  });

  it('rejects a definition whose semantic token points at a missing palette', async () => {
    const created = await createSystem('Acme');
    const definition = createDefaultDefinition();
    definition.colors.palettes = definition.colors.palettes.filter(
      (palette) => palette.name !== 'danger',
    );

    const response = await request(app)
      .patch(`/api/design-systems/${created.id}`)
      .set('Authorization', auth)
      .send({ definition });

    expect(response.status).toBe(400);
    expect(
      response.body.error.details.some((d: { message: string }) =>
        d.message.includes('unknown palette'),
      ),
    ).toBe(true);
  });

  it('rejects an empty patch', async () => {
    const created = await createSystem('Acme');

    const response = await request(app)
      .patch(`/api/design-systems/${created.id}`)
      .set('Authorization', auth)
      .send({});

    expect(response.status).toBe(400);
  });

  it('404s on another owner’s system', async () => {
    const other = await createTestUser();
    const theirs = await createSystem('Theirs', await authHeader(other.id));

    const response = await request(app)
      .patch(`/api/design-systems/${theirs.id}`)
      .set('Authorization', auth)
      .send({ name: 'Hijacked' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/design-systems/:id', () => {
  it('deletes then 404s', async () => {
    const created = await createSystem('Acme');

    expect(
      (await request(app).delete(`/api/design-systems/${created.id}`).set('Authorization', auth))
        .status,
    ).toBe(204);

    expect(
      (await request(app).get(`/api/design-systems/${created.id}`).set('Authorization', auth))
        .status,
    ).toBe(404);
  });

  it('will not delete another owner’s system', async () => {
    const other = await createTestUser();
    const otherAuth = await authHeader(other.id);
    const theirs = await createSystem('Theirs', otherAuth);

    const response = await request(app)
      .delete(`/api/design-systems/${theirs.id}`)
      .set('Authorization', auth);

    expect(response.status).toBe(404);

    // Still there for its actual owner.
    expect(
      (await request(app).get(`/api/design-systems/${theirs.id}`).set('Authorization', otherAuth))
        .status,
    ).toBe(200);
  });
});

describe('GET /api/design-systems/:id/export.zip', () => {
  it('streams a zip named after the slug', async () => {
    const created = await createSystem('Acme Design');

    const response = await request(app)
      .get(`/api/design-systems/${created.id}/export.zip`)
      .set('Authorization', auth)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/zip');
    expect(response.headers['content-disposition']).toBe('attachment; filename="acme-design.zip"');

    const zip = response.body as Buffer;
    // Local file header magic — proves it is a real archive, not an error page.
    expect(zip.subarray(0, 2).toString()).toBe('PK');

    // Zip stores entry names uncompressed in each local file header.
    const raw = zip.toString('latin1');
    for (const name of ['theme.css', 'tokens.css', 'semantic.css', 'README.md']) {
      expect(raw).toContain(name);
    }
  });

  it('404s on another owner’s system', async () => {
    const other = await createTestUser();
    const theirs = await createSystem('Theirs', await authHeader(other.id));

    const response = await request(app)
      .get(`/api/design-systems/${theirs.id}/export.zip`)
      .set('Authorization', auth);

    expect(response.status).toBe(404);
  });
});

describe('unknown routes', () => {
  it('use the standard error body', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });
});

describe('GET /api/health', () => {
  it('reports ok without auth', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
