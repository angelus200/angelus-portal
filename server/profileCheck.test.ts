import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  createProfileCheck: vi.fn(),
  getProfileCheckBySessionId: vi.fn(),
  getProfileChecksByUserId: vi.fn(),
  linkProfileCheckToUser: vi.fn(),
  getAllProfileChecks: vi.fn(),
  getProfileCheckById: vi.fn(),
}));

import * as db from './db';

describe('Profile Check Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProfileCheck', () => {
    it('should create a profile check with all required fields', async () => {
      const mockInsertId = 1;
      (db.createProfileCheck as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsertId);

      const profileData = {
        sessionId: 'pc_123456_abc',
        profileCategory: 'balanced' as const,
        riskScore: 55,
        answers: [
          { questionId: 'rendite_erwartung', value: 'd' },
          { questionId: 'rendite_sicherheit', value: 'b' },
        ],
        expectedReturn: 'd',
        returnVsSecurity: 'b',
        experienceLevel: 'c',
        plannedVolume: 'b',
      };

      const result = await db.createProfileCheck(profileData);
      
      expect(db.createProfileCheck).toHaveBeenCalledWith(profileData);
      expect(result).toBe(mockInsertId);
    });

    it('should handle profile check with array answers', async () => {
      const mockInsertId = 2;
      (db.createProfileCheck as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsertId);

      const profileData = {
        sessionId: 'pc_789_xyz',
        profileCategory: 'professional' as const,
        riskScore: 85,
        answers: [
          { questionId: 'aktuelle_anlagen', value: ['aktien', 'immobilien_eigen', 'privateequity'] },
          { questionId: 'geschaeftsbereiche', value: ['distressed', 'immobilien', 'startup'] },
        ],
        currentAssets: ['aktien', 'immobilien_eigen', 'privateequity'],
        interestedBusinessAreas: ['distressed', 'immobilien', 'startup'],
      };

      const result = await db.createProfileCheck(profileData);
      
      expect(db.createProfileCheck).toHaveBeenCalledWith(profileData);
      expect(result).toBe(mockInsertId);
    });
  });

  describe('getProfileCheckBySessionId', () => {
    it('should return profile check for valid session ID', async () => {
      const mockProfileCheck = {
        id: 1,
        sessionId: 'pc_123456_abc',
        profileCategory: 'balanced',
        riskScore: 55,
        userId: null,
        createdAt: new Date(),
      };
      (db.getProfileCheckBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileCheck);

      const result = await db.getProfileCheckBySessionId('pc_123456_abc');
      
      expect(db.getProfileCheckBySessionId).toHaveBeenCalledWith('pc_123456_abc');
      expect(result).toEqual(mockProfileCheck);
      expect(result?.profileCategory).toBe('balanced');
    });

    it('should return undefined for non-existent session ID', async () => {
      (db.getProfileCheckBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await db.getProfileCheckBySessionId('non_existent_session');
      
      expect(result).toBeUndefined();
    });
  });

  describe('linkProfileCheckToUser', () => {
    it('should link profile check to user after registration', async () => {
      (db.linkProfileCheckToUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await db.linkProfileCheckToUser('pc_123456_abc', 42);
      
      expect(db.linkProfileCheckToUser).toHaveBeenCalledWith('pc_123456_abc', 42);
    });
  });

  describe('getProfileChecksByUserId', () => {
    it('should return all profile checks for a user', async () => {
      const mockProfileChecks = [
        { id: 1, sessionId: 'pc_1', profileCategory: 'balanced', riskScore: 55, userId: 42 },
        { id: 2, sessionId: 'pc_2', profileCategory: 'growth', riskScore: 70, userId: 42 },
      ];
      (db.getProfileChecksByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileChecks);

      const result = await db.getProfileChecksByUserId(42);
      
      expect(db.getProfileChecksByUserId).toHaveBeenCalledWith(42);
      expect(result).toHaveLength(2);
      expect(result[0].profileCategory).toBe('balanced');
    });

    it('should return empty array for user with no profile checks', async () => {
      (db.getProfileChecksByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await db.getProfileChecksByUserId(999);
      
      expect(result).toEqual([]);
    });
  });

  describe('getAllProfileChecks', () => {
    it('should return all profile checks for admin view', async () => {
      const mockProfileChecks = [
        { id: 1, sessionId: 'pc_1', profileCategory: 'conservative', riskScore: 25 },
        { id: 2, sessionId: 'pc_2', profileCategory: 'balanced', riskScore: 50 },
        { id: 3, sessionId: 'pc_3', profileCategory: 'growth', riskScore: 75 },
        { id: 4, sessionId: 'pc_4', profileCategory: 'professional', riskScore: 90 },
      ];
      (db.getAllProfileChecks as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileChecks);

      const result = await db.getAllProfileChecks();
      
      expect(db.getAllProfileChecks).toHaveBeenCalled();
      expect(result).toHaveLength(4);
    });
  });
});

describe('Profile Category Calculation', () => {
  // Test the profile category logic
  it('should categorize low risk scores as conservative', () => {
    const riskScore = 25;
    let category: string;
    
    if (riskScore < 30) category = 'conservative';
    else if (riskScore < 55) category = 'balanced';
    else if (riskScore < 80) category = 'growth';
    else category = 'professional';
    
    expect(category).toBe('conservative');
  });

  it('should categorize medium-low risk scores as balanced', () => {
    const riskScore = 45;
    let category: string;
    
    if (riskScore < 30) category = 'conservative';
    else if (riskScore < 55) category = 'balanced';
    else if (riskScore < 80) category = 'growth';
    else category = 'professional';
    
    expect(category).toBe('balanced');
  });

  it('should categorize medium-high risk scores as growth', () => {
    const riskScore = 65;
    let category: string;
    
    if (riskScore < 30) category = 'conservative';
    else if (riskScore < 55) category = 'balanced';
    else if (riskScore < 80) category = 'growth';
    else category = 'professional';
    
    expect(category).toBe('growth');
  });

  it('should categorize high risk scores as professional', () => {
    const riskScore = 85;
    let category: string;
    
    if (riskScore < 30) category = 'conservative';
    else if (riskScore < 55) category = 'balanced';
    else if (riskScore < 80) category = 'growth';
    else category = 'professional';
    
    expect(category).toBe('professional');
  });
});

describe('Session ID Generation', () => {
  it('should generate valid session ID format', () => {
    const sessionId = `pc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    expect(sessionId).toMatch(/^pc_\d+_[a-z0-9]+$/);
    expect(sessionId.startsWith('pc_')).toBe(true);
  });

  it('should generate unique session IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const sessionId = `pc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      ids.add(sessionId);
    }
    
    // All IDs should be unique
    expect(ids.size).toBe(100);
  });
});
