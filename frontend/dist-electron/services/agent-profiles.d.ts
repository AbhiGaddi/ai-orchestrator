import { AgentProfile } from '../types';
export declare function listProfiles(): AgentProfile[];
export declare function getProfile(id: string): AgentProfile | undefined;
export declare function createProfile(data: Partial<AgentProfile>): AgentProfile;
export declare function updateProfile(id: string, data: Partial<AgentProfile>): AgentProfile;
export declare function deleteProfile(id: string): void;
