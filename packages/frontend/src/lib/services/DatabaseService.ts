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

interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

interface CreatePermissionData {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

interface UserAction {
  userId: string;
  action: string;
  resource: string;
  details?: any;
  timestamp: Date;
}

interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
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

  // Epic 9: Enhanced User Management Methods
  static async listUsers(filters: UserFilters = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.role) {
      where.roles = {
        some: { name: filters.role }
      };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        roles: true,
        activeRole: true
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' }
    });

    const total = await this.prisma.user.count({ where });

    return {
      users,
      total,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        totalPages: Math.ceil(total / (filters.limit || 50))
      }
    };
  }

  static async updateUser(id: string, updates: any) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        roles: true,
        activeRole: true
      }
    });
  }

  static async deleteUser(id: string) {
    // Soft delete by setting isActive to false
    return await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  static async assignRole(userId: string, roleId: string) {
    // Connect user to role
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: roleId }
        }
      }
    });

    return await this.getUserWithRoles(userId);
  }

  static async removeRole(userId: string, roleId: string) {
    // Disconnect user from role
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          disconnect: { id: roleId }
        }
      }
    });

    return await this.getUserWithRoles(userId);
  }

  static async createPermission(permission: CreatePermissionData) {
    return await this.prisma.permission.create({
      data: {
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action
      }
    });
  }

  static async listPermissions() {
    return await this.prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async assignPermissionToRole(roleId: string, permissionId: string) {
    return await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId
      }
    });
  }

  static async logUserAction(action: UserAction) {
    return await this.prisma.auditLog.create({
      data: {
        userId: action.userId,
        action: action.action,
        resource: action.resource,
        details: action.details || {},
        timestamp: action.timestamp
      }
    });
  }

  static async getAuditTrail(filters: AuditFilters = {}) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    return await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { timestamp: 'desc' }
    });
  }

  static async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      coordinatorUsers,
      recentUsers
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: {
          roles: { some: { name: 'ADMIN' } }
        }
      }),
      this.prisma.user.count({
        where: {
          roles: { some: { name: 'COORDINATOR' } }
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      coordinatorUsers,
      recentUsers,
      inactiveUsers: totalUsers - activeUsers
    };
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
      orderBy: { date: 'desc' },
      include: {
        affectedEntities: {
          take: 5 // Include first 5 affected entities
        }
      }
    });
  }

  static async getIncidentWithDetails(id: string) {
    return await this.prisma.incident.findUnique({
      where: { id },
      include: {
        affectedEntities: {
          include: {
            assessments: {
              orderBy: { createdAt: 'desc' },
              take: 3
            }
          }
        }
      }
    });
  }

  static async updateIncidentStatus(id: string, status: string, coordinatorId?: string) {
    return await this.prisma.incident.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  static async getIncidentTimeline(incidentId: string) {
    // For now, return empty array - timeline functionality would need separate timeline table
    return [];
  }

  static async getIncidentStats() {
    const [
      totalIncidents,
      activeIncidents,
      containedIncidents,
      resolvedIncidents,
      severeCriticalIncidents
    ] = await Promise.all([
      this.prisma.incident.count(),
      this.prisma.incident.count({ where: { status: 'ACTIVE' } }),
      this.prisma.incident.count({ where: { status: 'CONTAINED' } }),
      this.prisma.incident.count({ where: { status: 'RESOLVED' } }),
      this.prisma.incident.count({ 
        where: { 
          severity: { in: ['SEVERE', 'CATASTROPHIC'] } 
        } 
      })
    ]);

    // Get counts by type
    const typeStats = await this.prisma.incident.groupBy({
      by: ['type'],
      _count: { type: true }
    });

    const bySeverity = await this.prisma.incident.groupBy({
      by: ['severity'], 
      _count: { severity: true }
    });

    const byStatus = await this.prisma.incident.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    return {
      totalIncidents,
      activeIncidents,
      highPriorityIncidents: severeCriticalIncidents,
      recentlyUpdated: totalIncidents, // TODO: Calculate properly based on updatedAt
      byType: typeStats.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    };
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

  // Story 8.3: Enhanced Achievement System Methods
  static async getActiveAchievementRules() {
    return await this.prisma.achievementRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });
  }

  static async createAchievementRule(ruleData: any) {
    return await this.prisma.achievementRule.create({
      data: {
        name: ruleData.name || ruleData.title,
        description: ruleData.description,
        category: ruleData.category,
        type: ruleData.type,
        criteria: {
          triggerType: ruleData.triggerType,
          conditions: ruleData.triggerConditions || {},
          ...ruleData.criteria
        },
        reward: {
          badge: ruleData.badge,
          points: ruleData.points || 0,
          ...ruleData.reward
        },
        priority: ruleData.priority || 1,
        isActive: true
      }
    });
  }

  static async evaluateAchievementRule(rule: any, response: any): Promise<boolean> {
    // Simplified rule evaluation - would need more complex logic in production
    switch (rule.triggerType) {
      case 'VERIFICATION_COMPLETION':
        return response.verificationStatus === 'VERIFIED';
      case 'RESPONSE_DELIVERY':
        return response.status === 'DELIVERED';
      case 'MILESTONE_COUNT':
        // This would need more complex counting logic
        return true;
      default:
        return false;
    }
  }

  static async createVerificationBasedAchievement(achievementData: any) {
    return await this.prisma.donorAchievement.create({
      data: {
        donorId: achievementData.donorId,
        type: achievementData.type,
        title: achievementData.title,
        description: achievementData.description,
        category: achievementData.category || 'VERIFICATION',
        progress: 100,
        isUnlocked: true,
        unlockedAt: new Date(),
        verificationStatus: 'VERIFIED'
      }
    });
  }

  static async onResponseVerified(responseId: string) {
    // Get the response with donor information
    const response = await this.prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        donor: true,
        donorCommitments: {
          include: { donor: true }
        }
      }
    });

    if (!response || !response.donorCommitments.length) {
      return [];
    }

    const newAchievements = [];
    const rules = await this.getActiveAchievementRules();

    for (const commitment of response.donorCommitments) {
      if (!commitment.donorId) continue;

      for (const rule of rules) {
        const shouldAward = await this.evaluateAchievementRule(rule, response);
        
        if (shouldAward) {
          // Check if achievement already exists
          const existing = await this.prisma.donorAchievement.findFirst({
            where: {
              donorId: commitment.donorId,
              type: rule.type
            }
          });

          if (!existing) {
            const achievement = await this.createVerificationBasedAchievement({
              donorId: commitment.donorId,
              type: rule.type,
              title: rule.name,
              description: rule.description,
              category: rule.category
            });
            newAchievements.push(achievement);
          }
        }
      }
    }

    return newAchievements;
  }

  static async getAchievementsByDonor(donorId: string) {
    return await this.prisma.donorAchievement.findMany({
      where: { donorId },
      orderBy: { unlockedAt: 'desc' }
    });
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