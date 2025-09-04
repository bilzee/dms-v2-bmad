import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Types for service operations
interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

interface IncidentFilters {
  status?: string;
  severity?: string;
  type?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

interface AffectedEntityFilters {
  type?: 'CAMP' | 'COMMUNITY';
  lga?: string;
  ward?: string;
  limit?: number;
  offset?: number;
}

export class DatabaseService {
  private static prisma = prisma;

  // User Management (Epic 9: Multi-role authentication)
  static async createUser(userData: CreateUserData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Get role records
    const roleRecords = await this.prisma.role.findMany({
      where: {
        name: {
          in: userData.roles
        }
      }
    });

    const user = await this.prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        // Note: We're not storing password in the user model yet as per current schema
        roles: {
          connect: roleRecords.map(role => ({ id: role.id }))
        },
        activeRoleId: roleRecords[0]?.id
      },
      include: {
        roles: true,
        activeRole: true
      }
    });

    return user;
  }

  static async getUserWithRoles(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        activeRole: true
      }
    });
  }

  static async switchUserRole(userId: string, roleId: string) {
    // Verify user has this role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!user || !user.roles.some(role => role.id === roleId)) {
      throw new Error('User does not have access to this role');
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: { activeRoleId: roleId },
      include: {
        roles: true,
        activeRole: true
      }
    });
  }

  // Incident Management
  static async getIncidents(filters: IncidentFilters = {}) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.type) where.type = filters.type;
    if (filters.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    return await this.prisma.incident.findMany({
      where,
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { date: 'desc' }
    });
  }

  static async createIncident(incidentData: any) {
    return await this.prisma.incident.create({
      data: incidentData
    });
  }

  static async getIncidentById(id: string) {
    return await this.prisma.incident.findUnique({
      where: { id }
    });
  }

  static async updateIncident(id: string, data: any) {
    return await this.prisma.incident.update({
      where: { id },
      data
    });
  }

  // Affected Entities Management
  static async getAffectedEntities(filters: AffectedEntityFilters = {}) {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.lga) where.lga = filters.lga;
    if (filters.ward) where.ward = filters.ward;

    return await this.prisma.affectedEntity.findMany({
      where,
      take: filters.limit || 50,
      skip: filters.offset || 0,
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get latest assessment
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createAffectedEntity(entityData: any) {
    return await this.prisma.affectedEntity.create({
      data: entityData
    });
  }

  static async getAffectedEntityById(id: string) {
    return await this.prisma.affectedEntity.findUnique({
      where: { id },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  // Donor Management (Story 8.3: Achievement System)
  static async getDonors() {
    return await this.prisma.donor.findMany({
      include: {
        commitments: true,
        achievements: true
      },
      orderBy: { performanceScore: 'desc' }
    });
  }

  static async getDonorById(id: string) {
    return await this.prisma.donor.findUnique({
      where: { id },
      include: {
        commitments: {
          orderBy: { createdAt: 'desc' }
        },
        achievements: {
          orderBy: { unlockedAt: 'desc' }
        }
      }
    });
  }

  static async calculateAchievements(responseId?: string) {
    // Get all donors or specific donor commitments
    const commitments = await this.prisma.donorCommitment.findMany({
      where: responseId ? { rapidResponseId: responseId } : undefined,
      include: {
        donor: true,
        rapidResponse: true
      }
    });

    const achievements = [];

    for (const commitment of commitments) {
      // Achievement: First Delivery
      const existingFirstDelivery = await this.prisma.donorAchievement.findFirst({
        where: {
          donorId: commitment.donorId,
          type: 'FIRST_DELIVERY'
        }
      });

      if (!existingFirstDelivery && commitment.status === 'DELIVERED') {
        const achievement = await this.prisma.donorAchievement.create({
          data: {
            donorId: commitment.donorId,
            type: 'FIRST_DELIVERY',
            title: 'First Successful Delivery',
            description: 'Congratulations on your first successful delivery!',
            category: 'DELIVERY',
            progress: 100,
            isUnlocked: true,
            unlockedAt: new Date(),
            commitmentId: commitment.id,
            responseType: commitment.responseType,
            quantityDelivered: commitment.actualQuantity,
            unit: commitment.unit,
            deliveryDate: commitment.deliveredDate,
            verificationStatus: 'VERIFIED'
          }
        });
        achievements.push(achievement);
      }

      // Achievement: Milestone deliveries (10, 25, 50, 100)
      const deliveredCount = await this.prisma.donorCommitment.count({
        where: {
          donorId: commitment.donorId,
          status: 'DELIVERED'
        }
      });

      const milestones = [10, 25, 50, 100];
      for (const milestone of milestones) {
        if (deliveredCount >= milestone) {
          const existingMilestone = await this.prisma.donorAchievement.findFirst({
            where: {
              donorId: commitment.donorId,
              type: `MILESTONE_${milestone}`
            }
          });

          if (!existingMilestone) {
            const achievement = await this.prisma.donorAchievement.create({
              data: {
                donorId: commitment.donorId,
                type: `MILESTONE_${milestone}`,
                title: `${milestone} Deliveries Milestone`,
                description: `Amazing! You've completed ${milestone} successful deliveries.`,
                category: 'CONSISTENCY',
                progress: 100,
                isUnlocked: true,
                unlockedAt: new Date(),
                verificationStatus: 'VERIFIED'
              }
            });
            achievements.push(achievement);
          }
        }
      }
    }

    return achievements;
  }

  // Utility methods
  static async initializeDefaultRoles() {
    const defaultRoles = [
      'ASSESSOR',
      'RESPONDER', 
      'COORDINATOR',
      'DONOR',
      'VERIFIER',
      'ADMIN'
    ];

    for (const roleName of defaultRoles) {
      await this.prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: {
          name: roleName,
          isActive: true
        }
      });
    }
  }

  static async getStats() {
    const [
      totalIncidents,
      totalEntities,
      totalDonors,
      totalCommitments,
      totalAchievements
    ] = await Promise.all([
      this.prisma.incident.count(),
      this.prisma.affectedEntity.count(),
      this.prisma.donor.count(),
      this.prisma.donorCommitment.count(),
      this.prisma.donorAchievement.count()
    ]);

    return {
      totalIncidents,
      totalEntities,
      totalDonors,
      totalCommitments,
      totalAchievements
    };
  }

  static async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default DatabaseService;