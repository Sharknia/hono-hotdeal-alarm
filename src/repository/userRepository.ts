import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config';
import { User, UserCreateRequest } from '../types/auth';

export class UserRepository {
    private supabaseRead: SupabaseClient; // 읽기 전용 (ANON_KEY)
    private supabaseWrite: SupabaseClient; // 쓰기 전용 (SERVICE_ROLE_KEY)

    constructor() {
        const config = getConfig();
        // 읽기 작업용 클라이언트 (ANON_KEY)
        this.supabaseRead = createClient(config.supabaseUrl, config.supabaseAnonKey);
        // 쓰기 작업용 클라이언트 (SERVICE_ROLE_KEY)
        this.supabaseWrite = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
    }

    // 이메일로 사용자 조회 (읽기 작업)
    async findByEmail(email: string): Promise<User | null> {
        const { data, error } = await this.supabaseRead.from('users').select('*').eq('email', email).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // ID로 사용자 조회 (읽기 작업)
    async findById(id: string): Promise<User | null> {
        const { data, error } = await this.supabaseRead.from('users').select('*').eq('id', id).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 닉네임으로 사용자 조회 (읽기 작업)
    async findByNickname(nickname: string): Promise<User | null> {
        const { data, error } = await this.supabaseRead.from('users').select('*').eq('nickname', nickname).single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 레코드가 없는 경우
                return null;
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 사용자 생성 (쓰기 작업)
    async create(userData: UserCreateRequest & { hashedPassword: string }): Promise<User> {
        const { data, error } = await this.supabaseWrite
            .from('users')
            .insert([
                {
                    email: userData.email,
                    nickname: userData.nickname,
                    hashed_password: userData.hashedPassword,
                    auth_level: 1, // USER 레벨
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                // 유니크 제약 조건 위반
                throw new Error('Email already registered');
            }
            throw new Error(`Database error: ${error.message}`);
        }

        return data as User;
    }

    // 사용자 활성화 상태 업데이트 (쓰기 작업)
    async updateActiveStatus(userId: string, isActive: boolean): Promise<void> {
        const { error } = await this.supabaseWrite.from('users').update({ is_active: isActive }).eq('id', userId);

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
    }
}
