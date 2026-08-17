CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NULL,
  google_sub VARCHAR(255) UNIQUE NULL,
  apple_sub VARCHAR(255) UNIQUE NULL,
  display_name VARCHAR(100) NULL,
  height_cm DECIMAL(5,1) NULL,
  goal ENUM('bulk','cut','maintain') NOT NULL DEFAULT 'maintain',
  rest_timer_enabled TINYINT(1) NOT NULL DEFAULT 0,
  rest_timer_seconds INT NOT NULL DEFAULT 90,
  training_days VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
  split_type ENUM('upper_lower','ppl') NOT NULL DEFAULT 'upper_lower',
  rpe_enabled TINYINT(1) NOT NULL DEFAULT 0,
  measurements_enabled TINYINT(1) NOT NULL DEFAULT 0,
  custom_protein_g DECIMAL(6,1) NULL,
  custom_carbs_g DECIMAL(6,1) NULL,
  custom_fat_g DECIMAL(6,1) NULL,
  onboarding_completed TINYINT(1) NOT NULL DEFAULT 0,
  avatar_path VARCHAR(255) NULL,
  season_number INT NULL,
  season_points INT NULL,
  season_rank VARCHAR(20) NULL,
  season_division VARCHAR(5) NULL,
  expo_push_token VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  target ENUM('upper','lower') NOT NULL,
  muscle_group VARCHAR(50) NULL,
  is_custom TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_exercise_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_exercises_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  category ENUM('upper','lower','custom','push','pull','legs') NOT NULL,
  notes TEXT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  exercise_id INT NOT NULL,
  set_number INT NOT NULL,
  reps INT NOT NULL DEFAULT 0,
  weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0,
  rpe DECIMAL(3,1) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_set_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_set_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  INDEX idx_sets_session (session_id),
  INDEX idx_sets_exercise (exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS body_weight_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bw_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bw_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS measurement_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  type ENUM('biceps','waist','chest','thighs','neck','forearms','calves','hips') NOT NULL,
  value_cm DECIMAL(5,1) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_measurement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_measurement_user_type_date (user_id, type, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nutrition_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  protein_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  food_name VARCHAR(150) NULL,
  grams DECIMAL(7,1) NULL,
  unit VARCHAR(4) NULL DEFAULT 'g',
  barcode VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nutrition_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_nutrition_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No shared ancestor with `exercises` — cascades cleanly off `users` on its own, no ordering
-- workaround needed in routes/users.js unlike workout_templates/sessions above.
CREATE TABLE IF NOT EXISTS friendships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  addressee_id INT NOT NULL,
  status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  CONSTRAINT fk_friendship_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_friendship_addressee FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_friendship_pair (requester_id, addressee_id),
  INDEX idx_friendship_addressee (addressee_id, status),
  INDEX idx_friendship_requester (requester_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_template_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_templates_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No ON DELETE CASCADE on exercise_id, deliberately — same reasoning as fk_set_exercise
-- (see sets above): it must survive a soft-deleted exercise, and giving it one would
-- reintroduce the users -> exercises vs users -> workout_templates -> this ordering bug
-- (see routes/users.js's account-deletion comment).
CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  exercise_id INT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_template_exercise_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_exercise_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  INDEX idx_template_exercises_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
