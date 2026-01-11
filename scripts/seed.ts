import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Note: Usually for seeding/admin tasks you'd use the SERVICE_ROLE_KEY to bypass RLS,
// but for client-side simulation we can use the ANON key and sign up/sign in.
// If RLS prevents insertion even for the owner without a session, we need to sign in.
// However, the requested flow is to "create a user", so we will simulate that.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_EMAIL = 'moisesdaipb@yahoo.com';
const TEST_PASSWORD = 'moises';

async function seed() {
    console.log('🌱 Starting seed...');

    // 1. Sign Up User
    console.log(`Creating user ${TEST_EMAIL}...`);
    let userId = '';

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
            data: {
                full_name: 'Moises Tester',
            },
        },
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists. You can proceed with SQL seeding.');
            // We can't get the ID easily via client if we can't login, so we will handle ID retrieval via SQL.
        } else {
            console.error('Error creating user:', authError.message);
            process.exit(1);
        }
    } else if (authData.user) {
        console.log(`User created successfully! ID: ${authData.user.id}`);
        userId = authData.user.id;
    }
}

seed().catch(console.error);
