import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const usernameAdjectives = [
  "bright",
  "silent",
  "bold",
  "curious",
  "lucky",
  "brave",
  "cosmic",
  "swift",
  "clever",
  "stellar"
];

const usernameNouns = [
  "walrus",
  "river",
  "comet",
  "panda",
  "falcon",
  "nebula",
  "tiger",
  "otter",
  "aurora",
  "pixel"
];

function randomItem(list: string[]) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function generateRandomUsername() {
  const adjective = randomItem(usernameAdjectives);
  const noun = randomItem(usernameNouns);
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${adjective}-${noun}-${number}`;
}

export async function ensureUserProfile(user: { id: string }) {
  if (!user.id) {
    return null;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const username = generateRandomUsername();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export { supabase };
export default supabase;
