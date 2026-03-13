export interface EnvVar {
    key: string;
    value: string;
    encrypted_value: Buffer;
    created_at: string;
}
export declare function listEnvVars(): EnvVar[];
export declare function writeEnvVar(key: string, value: string): void;
export declare function deleteEnvVar(key: string): void;
