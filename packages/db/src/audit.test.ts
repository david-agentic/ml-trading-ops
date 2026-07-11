import { describe, expect, it, vi } from 'vitest';
import { buildAuditLogInsert, writeAuditLog } from './audit';
import type { Db } from './client';

function createMockDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  return { db: { insert } as unknown as Db, insert, values };
}

describe('audit log helper', () => {
  it('buildAuditLogInsert fills optional fields with null defaults', () => {
    const { db, values } = createMockDb();

    buildAuditLogInsert(db, {
      actorUserId: 'user-1',
      actorRole: 'super_admin',
      actorEmail: 'a@b.com',
      action: 'login',
      resourceType: 'auth',
      relatedModule: 'system',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: null,
        oldValue: null,
        newValue: null,
        reason: null,
        ipAddress: null,
        userAgent: null,
      }),
    );
  });

  it('writeAuditLog awaits the insert', async () => {
    const { db, insert, values } = createMockDb();

    await writeAuditLog(db, {
      actorUserId: null,
      actorRole: null,
      actorEmail: null,
      action: 'permission_change',
      resourceType: 'user',
      resourceId: 'user-2',
      relatedModule: 'admin',
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
  });
});
