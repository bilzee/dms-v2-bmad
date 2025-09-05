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

  static async getAchievementsByDonor(donorId: string, filters?: any) {
    const whereClause: any = { donorId };
    
    if (filters?.category && filters.category !== 'ALL') {
      whereClause.category = filters.category;
    }

    return await this.prisma.donorAchievement.findMany({
      where: whereClause,
      orderBy: [
        { isUnlocked: 'desc' },
        { unlockedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  static async getDonorCommitmentsStats(donorId: string) {
    return await this.prisma.donorCommitment.findMany({
      where: {
        donorId,
        status: 'DELIVERED'
      },
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      }
    });
  }

  static async updateAchievementProgress(achievementId: string, progress: number, shouldUnlock?: boolean) {
    return await this.prisma.donorAchievement.update({
      where: { id: achievementId },
      data: {
        progress,
        isUnlocked: shouldUnlock || undefined,
        unlockedAt: shouldUnlock ? new Date() : undefined,
      }
    });
  }

  static async createDonorAchievement(achievementData: any) {
    return await this.prisma.donorAchievement.create({
      data: achievementData
    });
  }

  static async getVerificationById(verificationId: string) {
    return await this.prisma.rapidResponse.findUnique({
      where: { id: verificationId },
      include: {
        donor: true,
        donorCommitments: true
      }
    });
  }

  // Achievement Engine support methods
  static async getDonorVerificationStats(donorId: string) {
    // Get all verified responses linked to this donor
    const verifiedCommitments = await this.prisma.donorCommitment.findMany({
      where: {
        donorId,
        status: 'DELIVERED'
      },
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      },
      orderBy: { deliveredDate: 'desc' }
    });

    const verifiedDeliveries = verifiedCommitments.filter(c => c.rapidResponse);
    
    // Calculate beneficiaries helped through verified responses
    const totalBeneficiaries = verifiedDeliveries.reduce((total, commitment) => {
      if (commitment.rapidResponse?.data) {
        const responseData = commitment.rapidResponse.data as any;
        if (responseData.personsServed) total += responseData.personsServed;
        if (responseData.householdsServed) total += responseData.householdsServed * 4;
      }
      return total;
    }, 0);

    // Group by response type for specialization tracking
    const responseTypeGroups = verifiedDeliveries.reduce((groups, commitment) => {
      const responseType = commitment.responseType;
      if (!groups[responseType]) groups[responseType] = [];
      groups[responseType].push(commitment);
      return groups;
    }, {} as Record<string, any[]>);

    // Calculate verification streak
    let currentStreak = 0;
    const allCommitments = await this.prisma.donorCommitment.findMany({
      where: { donorId, status: 'DELIVERED' },
      include: { rapidResponse: true },
      orderBy: { deliveredDate: 'desc' }
    });

    for (const commitment of allCommitments) {
      if (commitment.rapidResponse?.verificationStatus === 'VERIFIED') {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalVerifiedDeliveries: verifiedDeliveries.length,
      totalBeneficiariesHelped: totalBeneficiaries,
      verificationRate: allCommitments.length > 0 
        ? (verifiedDeliveries.length / allCommitments.length) * 100 
        : 0,
      currentVerificationStreak: currentStreak,
      responseTypeDeliveries: responseTypeGroups,
      latestVerification: verifiedDeliveries[0]?.rapidResponse?.updatedAt
    };
  }

  static async checkExistingAchievement(donorId: string, ruleId: string) {
    const existing = await this.prisma.donorAchievement.findFirst({
      where: {
        donorId,
        type: ruleId
      }
    });
    return !!existing;
  }

  static async createVerificationAchievement(achievementData: any) {
    return await this.prisma.donorAchievement.create({
      data: achievementData
    });
  }

  static async countDonorAchievements(donorId: string) {
    return await this.prisma.donorAchievement.count({
      where: { donorId, isUnlocked: true }
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

  // Additional User Management Methods for Admin Features
  static async createUserWithAdmin(userData: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    roleIds: string[];
    isActive?: boolean;
    createdBy: string;
    createdByName: string;
  }) {
    // Get role records
    const roleRecords = await this.prisma.role.findMany({
      where: {
        id: {
          in: userData.roleIds
        }
      }
    });

    const user = await this.prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        organization: userData.organization,
        isActive: userData.isActive ?? true,
        roles: {
          connect: roleRecords.map(role => ({ id: role.id }))
        },
        activeRoleId: roleRecords[0]?.id
      },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        activeRole: true
      }
    });

    // Log audit trail
    await this.logUserAction({
      userId: userData.createdBy,
      userName: userData.createdByName,
      action: 'CREATE_USER',
      resource: 'USER',
      resourceId: user.id,
      details: {
        newUser: {
          name: userData.name,
          email: userData.email,
          organization: userData.organization,
          roles: roleRecords.map(r => r.name)
        }
      }
    });

    return user;
  }

  static async updateUserWithAdmin(
    userId: string, 
    updates: {
      name?: string;
      phone?: string;
      organization?: string;
      roleIds?: string[];
      isActive?: boolean;
    },
    updatedBy: string,
    updatedByName: string
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.organization !== undefined) updateData.organization = updates.organization;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    // Handle role updates
    if (updates.roleIds) {
      const roleRecords = await this.prisma.role.findMany({
        where: { id: { in: updates.roleIds } }
      });

      updateData.roles = {
        set: roleRecords.map(role => ({ id: role.id }))
      };
      
      if (roleRecords.length > 0) {
        updateData.activeRoleId = roleRecords[0].id;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        activeRole: true
      }
    });

    // Log audit trail
    await this.logUserAction({
      userId: updatedBy,
      userName: updatedByName,
      action: 'UPDATE_USER',
      resource: 'USER',
      resourceId: userId,
      details: {
        updates,
        oldValues: {
          name: currentUser.name,
          phone: currentUser.phone,
          organization: currentUser.organization,
          isActive: currentUser.isActive,
          roles: currentUser.roles.map(r => r.name)
        }
      }
    });

    return updatedUser;
  }

  static async toggleUserStatus(
    userIds: string[],
    isActive: boolean,
    updatedBy: string,
    updatedByName: string,
    reason?: string
  ) {
    const updatedUsers = await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive }
    });

    // Log audit trail for batch operation
    await this.logUserAction({
      userId: updatedBy,
      userName: updatedByName,
      action: isActive ? 'ACTIVATE_USERS' : 'DEACTIVATE_USERS',
      resource: 'USER',
      details: {
        userIds,
        isActive,
        reason,
        affectedCount: updatedUsers.count
      }
    });

    return updatedUsers;
  }

  static async getAllRoles() {
    return await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentUsers,
      adminUsers,
      coordinatorUsers
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      this.prisma.user.count({
        where: {
          roles: {
            some: { name: 'ADMIN' }
          }
        }
      }),
      this.prisma.user.count({
        where: {
          roles: {
            some: { name: 'COORDINATOR' }
          }
        }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentUsers,
      adminUsers,
      coordinatorUsers
    };
  }

  // Enhanced audit logging
  static async logUserAction(action: {
    userId: string;
    userName?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }) {
    return await this.prisma.auditLog.create({
      data: {
        userId: action.userId,
        userName: action.userName,
        action: action.action,
        resource: action.resource,
        resourceId: action.resourceId,
        details: action.details || {},
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
        sessionId: action.sessionId,
        timestamp: new Date()
      }
    });
  }

  static async getAuditLogs(filters: AuditFilters = {}) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { timestamp: 'desc' }
    });

    const total = await this.prisma.auditLog.count({ where });

    return {
      logs,
      total,
      pagination: {
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        totalPages: Math.ceil(total / (filters.limit || 100))
      }
    };
  }

  // Bulk import tracking methods
  static async createBulkImport(data: {
    fileName: string;
    fileSize: number;
    totalRows: number;
    importedBy: string;
    importedByName: string;
  }) {
    return await this.prisma.bulkImport.create({
      data: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalRows: data.totalRows,
        importedBy: data.importedBy,
        importedByName: data.importedByName,
        status: 'PROCESSING'
      }
    });
  }

  static async updateBulkImportProgress(
    importId: string,
    updates: {
      processedRows?: number;
      successfulRows?: number;
      failedRows?: number;
      errors?: any[];
      status?: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    }
  ) {
    const updateData: any = { ...updates };
    if (updates.status === 'COMPLETED' || updates.status === 'FAILED') {
      updateData.completedAt = new Date();
    }

    return await this.prisma.bulkImport.update({
      where: { id: importId },
      data: updateData
    });
  }

  static async getBulkImport(importId: string) {
    return await this.prisma.bulkImport.findUnique({
      where: { id: importId }
    });
  }

  static async getBulkImports(filters: {
    importedBy?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: any = {};

    if (filters.importedBy) where.importedBy = filters.importedBy;
    if (filters.status) where.status = filters.status;

    const imports = await this.prisma.bulkImport.findMany({
      where,
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' }
    });

    const total = await this.prisma.bulkImport.count({ where });

    return {
      imports,
      total,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        totalPages: Math.ceil(total / (filters.limit || 50))
      }
    };
  }

  // Enhanced Role Assignment Methods for Story 9.2
  static async assignUserRoles(
    userId: string,
    roleIds: string[],
    changedBy: string,
    changedByName: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get current user roles for history tracking
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    const currentRoleIds = currentUser.roles.map(r => r.id);
    const newRoleIds = roleIds;

    // Get roles being added and removed
    const addedRoleIds = newRoleIds.filter(id => !currentRoleIds.includes(id));
    const removedRoleIds = currentRoleIds.filter(id => !newRoleIds.includes(id));

    // Update user roles
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: roleIds.map(id => ({ id }))
        },
        activeRoleId: roleIds[0] || null,
        updatedAt: new Date()
      },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        activeRole: true
      }
    });

    // Log role history for added roles
    for (const roleId of addedRoleIds) {
      await this.prisma.roleHistory.create({
        data: {
          userId,
          roleId,
          action: 'ADDED',
          previousData: { currentRoles: currentRoleIds },
          changedBy,
          changedByName,
          reason,
          ipAddress,
          userAgent
        }
      });
    }

    // Log role history for removed roles
    for (const roleId of removedRoleIds) {
      await this.prisma.roleHistory.create({
        data: {
          userId,
          roleId,
          action: 'REMOVED',
          previousData: { currentRoles: currentRoleIds },
          changedBy,
          changedByName,
          reason,
          ipAddress,
          userAgent
        }
      });
    }

    // Log audit trail
    await this.logUserAction({
      userId: changedBy,
      userName: changedByName,
      action: 'ASSIGN_ROLES',
      resource: 'USER_ROLES',
      resourceId: userId,
      details: {
        addedRoles: addedRoleIds,
        removedRoles: removedRoleIds,
        newRoles: newRoleIds,
        reason
      },
      ipAddress,
      userAgent
    });

    return updatedUser;
  }

  static async bulkAssignRoles(
    userIds: string[],
    roleIds: string[],
    changedBy: string,
    changedByName: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.assignUserRoles(
          userId,
          roleIds,
          changedBy,
          changedByName,
          reason,
          ipAddress,
          userAgent
        );
        results.push({ userId, success: true, user: result });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  static async getUserRoleHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const history = await this.prisma.roleHistory.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    const total = await this.prisma.roleHistory.count({
      where: { userId }
    });

    return {
      history,
      total,
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getPermissionMatrix() {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        },
        where: { isActive: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.permission.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
    ]);

    // Build matrix
    const matrix: Record<string, Record<string, boolean>> = {};
    
    roles.forEach(role => {
      matrix[role.id] = {};
      const rolePermissionIds = role.permissions.map(rp => rp.permissionId);
      
      permissions.forEach(permission => {
        matrix[role.id][permission.id] = rolePermissionIds.includes(permission.id);
      });
    });

    return {
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: `System role with ${role.permissions.length} permissions`,
        userCount: role._count.users,
        permissions: role.permissions.map(rp => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
          resource: rp.permission.resource,
          action: rp.permission.action,
          isActive: rp.permission.isActive
        })),
        isActive: role.isActive
      })),
      permissions: permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        isActive: permission.isActive
      })),
      matrix
    };
  }

  static async rollbackRoleChange(
    historyId: string,
    rolledBackBy: string,
    rolledBackByName: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const historyRecord = await this.prisma.roleHistory.findUnique({
      where: { id: historyId }
    });

    if (!historyRecord) {
      throw new Error('Role history record not found');
    }

    const { userId, roleId, action, previousData } = historyRecord;
    
    // Determine rollback action
    let rollbackAction: string;
    let newRoleIds: string[];

    if (previousData && typeof previousData === 'object' && 'currentRoles' in previousData) {
      newRoleIds = (previousData as any).currentRoles as string[];
      rollbackAction = 'ROLLBACK';
    } else {
      // Fallback: reverse the action
      if (action === 'ADDED') {
        rollbackAction = 'REMOVED';
        const currentUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { roles: true }
        });
        newRoleIds = currentUser?.roles.filter(r => r.id !== roleId).map(r => r.id) || [];
      } else if (action === 'REMOVED') {
        rollbackAction = 'ADDED';
        const currentUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { roles: true }
        });
        newRoleIds = [...(currentUser?.roles.map(r => r.id) || []), roleId];
      } else {
        throw new Error('Cannot rollback this type of role change');
      }
    }

    // Apply rollback
    const rolledBackUser = await this.assignUserRoles(
      userId,
      newRoleIds,
      rolledBackBy,
      rolledBackByName,
      `Rollback: ${reason || 'Role change reverted'}`,
      ipAddress,
      userAgent
    );

    // Log rollback action
    await this.prisma.roleHistory.create({
      data: {
        userId,
        roleId: historyRecord.roleId,
        action: 'ROLLBACK',
        previousData: { 
          originalHistoryId: historyId,
          originalAction: action 
        },
        changedBy: rolledBackBy,
        changedByName: rolledBackByName,
        reason: `Rollback: ${reason || 'Role change reverted'}`,
        ipAddress,
        userAgent
      }
    });

    return rolledBackUser;
  }

  static async setActiveRole(
    userId: string,
    roleId: string,
    changedBy: string,
    changedByName: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Verify user has this role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, activeRole: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hasRole = user.roles.some(role => role.id === roleId);
    if (!hasRole) {
      throw new Error('User does not have the specified role');
    }

    const previousActiveRoleId = user.activeRoleId;

    // Update active role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        activeRoleId: roleId,
        updatedAt: new Date()
      },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        },
        activeRole: true
      }
    });

    // Log role history
    if (previousActiveRoleId) {
      await this.prisma.roleHistory.create({
        data: {
          userId,
          roleId: previousActiveRoleId,
          action: 'DEACTIVATED',
          changedBy,
          changedByName,
          reason: 'Role switch',
          ipAddress,
          userAgent
        }
      });
    }

    await this.prisma.roleHistory.create({
      data: {
        userId,
        roleId,
        action: 'ACTIVATED',
        changedBy,
        changedByName,
        reason: 'Role switch',
        ipAddress,
        userAgent
      }
    });

    // Log audit trail
    await this.logUserAction({
      userId: changedBy,
      userName: changedByName,
      action: 'SWITCH_ACTIVE_ROLE',
      resource: 'USER_ROLE',
      resourceId: userId,
      details: {
        previousActiveRoleId,
        newActiveRoleId: roleId
      },
      ipAddress,
      userAgent
    });

    return updatedUser;
  }

  // Notification management
  static async createNotification(notificationData: any) {
    return await this.prisma.notification.create({
      data: {
        ...notificationData,
        status: 'PENDING'
      }
    });
  }

  static async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default DatabaseService;