import { db, OfflineDatabase } from '@/lib/offline/db';
import { AffectedEntity } from '@dms/shared';

// Setup test database
const testDb = new (OfflineDatabase as any)('TestDB');

describe('Entity Creation Integration', () => {
  beforeEach(async () => {
    // Clear test database
    await testDb.entities.clear();
    await testDb.entityDrafts.clear();
    await testDb.queue.clear();
  });

  afterAll(async () => {
    await testDb.delete();
  });

  describe('Entity CRUD Operations', () => {
    it('should create and save a camp entity', async () => {
      const campEntity: AffectedEntity = {
        id: 'camp-123',
        type: 'CAMP',
        name: 'Test IDP Camp',
        lga: 'Maiduguri',
        ward: 'Central Ward',
        longitude: 13.1511,
        latitude: 11.8469,
        campDetails: {
          campName: 'Maiduguri Test Camp',
          campStatus: 'OPEN',
          campCoordinatorName: 'Ahmad Hassan',
          campCoordinatorPhone: '+2348012345678',
          superviserName: 'Dr. Fatima Mohammed',
          superviserOrganization: 'NEMA',
          estimatedPopulation: 1500,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedId = await testDb.saveEntity(campEntity);
      expect(savedId).toBe('camp-123');

      const retrieved = await testDb.getEntityById('camp-123');
      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe('CAMP');
      expect(retrieved!.name).toBe('Test IDP Camp');
      expect(retrieved!.campDetails!.campName).toBe('Maiduguri Test Camp');
    });

    it('should create and save a community entity', async () => {
      const communityEntity: AffectedEntity = {
        id: 'community-456',
        type: 'COMMUNITY',
        name: 'Test Community',
        lga: 'Konduga',
        ward: 'Kawuri Ward',
        longitude: 13.2000,
        latitude: 11.7500,
        communityDetails: {
          communityName: 'Kawuri Community',
          contactPersonName: 'Usman Mohammed',
          contactPersonPhone: '+2348098765432',
          contactPersonRole: 'Village Head',
          estimatedHouseholds: 250,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedId = await testDb.saveEntity(communityEntity);
      expect(savedId).toBe('community-456');

      const retrieved = await testDb.getEntityById('community-456');
      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe('COMMUNITY');
      expect(retrieved!.communityDetails!.contactPersonName).toBe('Usman Mohammed');
    });

    it('should filter entities by type', async () => {
      // Create both camp and community entities
      const campEntity: AffectedEntity = {
        id: 'camp-1',
        type: 'CAMP',
        name: 'Camp 1',
        lga: 'LGA 1',
        ward: 'Ward 1',
        longitude: 13.0,
        latitude: 11.0,
        campDetails: {
          campName: 'Camp 1',
          campStatus: 'OPEN',
          campCoordinatorName: 'Coordinator 1',
          campCoordinatorPhone: '+234123456789',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const communityEntity: AffectedEntity = {
        id: 'community-1',
        type: 'COMMUNITY',
        name: 'Community 1',
        lga: 'LGA 1',
        ward: 'Ward 1',
        longitude: 13.1,
        latitude: 11.1,
        communityDetails: {
          communityName: 'Community 1',
          contactPersonName: 'Contact 1',
          contactPersonPhone: '+234987654321',
          contactPersonRole: 'Chief',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await testDb.saveEntity(campEntity);
      await testDb.saveEntity(communityEntity);

      // Filter by CAMP type
      const camps = await testDb.getEntities({ type: 'CAMP' });
      expect(camps).toHaveLength(1);
      expect(camps[0].type).toBe('CAMP');

      // Filter by COMMUNITY type
      const communities = await testDb.getEntities({ type: 'COMMUNITY' });
      expect(communities).toHaveLength(1);
      expect(communities[0].type).toBe('COMMUNITY');

      // Get all entities
      const allEntities = await testDb.getEntities();
      expect(allEntities).toHaveLength(2);
    });

    it('should search entities by name, LGA, or ward', async () => {
      const entities: AffectedEntity[] = [
        {
          id: 'entity-1',
          type: 'CAMP',
          name: 'Maiduguri Camp',
          lga: 'Maiduguri',
          ward: 'Central Ward',
          longitude: 13.0,
          latitude: 11.0,
          campDetails: {
            campName: 'Maiduguri Camp',
            campStatus: 'OPEN',
            campCoordinatorName: 'Coordinator',
            campCoordinatorPhone: '+234123456789',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entity-2',
          type: 'COMMUNITY',
          name: 'Borno Community',
          lga: 'Konduga',
          ward: 'Kawuri Ward',
          longitude: 13.1,
          latitude: 11.1,
          communityDetails: {
            communityName: 'Borno Community',
            contactPersonName: 'Contact',
            contactPersonPhone: '+234987654321',
            contactPersonRole: 'Chief',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const entity of entities) {
        await testDb.saveEntity(entity);
      }

      // Search by name
      const nameResults = await testDb.searchEntities('Maiduguri');
      expect(nameResults).toHaveLength(1);
      expect(nameResults[0].name).toBe('Maiduguri Camp');

      // Search by LGA
      const lgaResults = await testDb.searchEntities('Konduga');
      expect(lgaResults).toHaveLength(1);
      expect(lgaResults[0].lga).toBe('Konduga');

      // Search by ward
      const wardResults = await testDb.searchEntities('Central');
      expect(wardResults).toHaveLength(1);
      expect(wardResults[0].ward).toBe('Central Ward');
    });

    it('should handle entity updates', async () => {
      const originalEntity: AffectedEntity = {
        id: 'update-test',
        type: 'CAMP',
        name: 'Original Name',
        lga: 'Original LGA',
        ward: 'Original Ward',
        longitude: 13.0,
        latitude: 11.0,
        campDetails: {
          campName: 'Original Camp',
          campStatus: 'OPEN',
          campCoordinatorName: 'Original Coordinator',
          campCoordinatorPhone: '+234111111111',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await testDb.saveEntity(originalEntity);

      // Update the entity
      const updatedEntity = {
        ...originalEntity,
        name: 'Updated Name',
        campDetails: {
          ...originalEntity.campDetails!,
          campCoordinatorName: 'Updated Coordinator',
        },
        updatedAt: new Date(),
      };

      await testDb.saveEntity(updatedEntity);

      const retrieved = await testDb.getEntityById('update-test');
      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.campDetails!.campCoordinatorName).toBe('Updated Coordinator');
    });

    it('should delete entities', async () => {
      const entity: AffectedEntity = {
        id: 'delete-test',
        type: 'COMMUNITY',
        name: 'To Be Deleted',
        lga: 'Test LGA',
        ward: 'Test Ward',
        longitude: 13.0,
        latitude: 11.0,
        communityDetails: {
          communityName: 'To Be Deleted',
          contactPersonName: 'Test Contact',
          contactPersonPhone: '+234123456789',
          contactPersonRole: 'Test Role',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await testDb.saveEntity(entity);

      let retrieved = await testDb.getEntityById('delete-test');
      expect(retrieved).toBeDefined();

      await testDb.deleteEntity('delete-test');

      retrieved = await testDb.getEntityById('delete-test');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Entity Draft Operations', () => {
    it('should save and retrieve entity drafts', async () => {
      const draftData = {
        type: 'CAMP' as const,
        name: 'Draft Camp',
        lga: 'Draft LGA',
        ward: 'Draft Ward',
        latitude: 11.0,
        longitude: 13.0,
        campDetails: {
          campName: 'Draft Camp Name',
          campStatus: 'OPEN' as const,
          campCoordinatorName: 'Draft Coordinator',
          campCoordinatorPhone: '+234123456789',
        },
      };

      const draftId = await testDb.saveEntityDraft({
        id: 'draft-123',
        type: 'CAMP',
        data: draftData,
        formData: draftData,
      });

      expect(draftId).toBe('draft-123');

      const retrieved = await testDb.getEntityDraft('draft-123');
      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe('CAMP');
      expect(retrieved!.data.name).toBe('Draft Camp');
    });

    it('should filter drafts by type', async () => {
      await testDb.saveEntityDraft({
        id: 'camp-draft',
        type: 'CAMP',
        data: { type: 'CAMP' },
        formData: {},
      });

      await testDb.saveEntityDraft({
        id: 'community-draft',
        type: 'COMMUNITY',
        data: { type: 'COMMUNITY' },
        formData: {},
      });

      const campDrafts = await testDb.getEntityDraftsByType('CAMP');
      expect(campDrafts).toHaveLength(1);
      expect(campDrafts[0].type).toBe('CAMP');

      const communityDrafts = await testDb.getEntityDraftsByType('COMMUNITY');
      expect(communityDrafts).toHaveLength(1);
      expect(communityDrafts[0].type).toBe('COMMUNITY');
    });

    it('should delete entity drafts', async () => {
      await testDb.saveEntityDraft({
        id: 'draft-delete-test',
        type: 'CAMP',
        data: {},
        formData: {},
      });

      let retrieved = await testDb.getEntityDraft('draft-delete-test');
      expect(retrieved).toBeDefined();

      await testDb.deleteEntityDraft('draft-delete-test');

      retrieved = await testDb.getEntityDraft('draft-delete-test');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt entity data when required', async () => {
      const sensitiveEntity: AffectedEntity = {
        id: 'sensitive-entity',
        type: 'CAMP',
        name: 'Sensitive Camp',
        lga: 'Test LGA',
        ward: 'Test Ward',
        longitude: 13.0,
        latitude: 11.0,
        campDetails: {
          campName: 'Sensitive Camp',
          campStatus: 'OPEN',
          campCoordinatorName: 'Sensitive Coordinator',
          campCoordinatorPhone: '+234123456789',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedId = await testDb.saveEntity(sensitiveEntity);
      expect(savedId).toBe('sensitive-entity');

      // Entity should be saved with encryption
      const rawRecord = await testDb.entities.get('sensitive-entity');
      expect(rawRecord).toBeDefined();
      expect(rawRecord!.encryptedData).toBeDefined();

      // But retrieval should return decrypted data
      const retrieved = await testDb.getEntityById('sensitive-entity');
      expect(retrieved!.campDetails!.campCoordinatorName).toBe('Sensitive Coordinator');
    });
  });

  describe('Queue Operations for Entity Sync', () => {
    it('should add entity operations to sync queue', async () => {
      const queueItem = {
        type: 'ENTITY' as const,
        action: 'CREATE' as const,
        data: { id: 'test-entity', type: 'CAMP' },
        priority: 'HIGH' as const,
      };

      const queueId = await testDb.addToQueue(queueItem);
      expect(queueId).toBeDefined();

      const queueItems = await testDb.getQueueItems('HIGH');
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].type).toBe('ENTITY');
      expect(queueItems[0].action).toBe('CREATE');
    });

    it('should prioritize entity operations correctly', async () => {
      // Add entity operations with different priorities
      await testDb.addToQueue({
        type: 'ENTITY',
        action: 'CREATE',
        data: {},
        priority: 'HIGH',
      });

      await testDb.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {},
        priority: 'NORMAL',
      });

      await testDb.addToQueue({
        type: 'ENTITY',
        action: 'UPDATE',
        data: {},
        priority: 'NORMAL',
      });

      const allItems = await testDb.getQueueItems();
      expect(allItems).toHaveLength(3);

      // High priority items should be processed first
      const highPriorityItems = await testDb.getQueueItems('HIGH');
      expect(highPriorityItems).toHaveLength(1);
      expect(highPriorityItems[0].type).toBe('ENTITY');
    });
  });
});