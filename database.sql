CREATE DATABASE modern_digital_banking;


CREATE TYPE kyc_status_enum AS ENUM ('unverified', 'verified');

CREATE TYPE account_type_enum AS ENUM (
    'savings',
    'checking',
    'credit_card',
    'loan',
    'investment'
);

CREATE TYPE txn_type_enum AS ENUM ('debit', 'credit');
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    kyc_status kyc_status_enum DEFAULT 'unverified',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100),
    account_type account_type_enum,
    masked_account VARCHAR(20),
    currency CHAR(3),
    balance NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    description VARCHAR(255),
    category VARCHAR(100),
    amount NUMERIC(15,2),
    currency CHAR(3),
    txn_type txn_type_enum,
    merchant VARCHAR(100),
    txn_date TIMESTAMP,
    posted_date TIMESTAMP
);
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    month INT CHECK (month BETWEEN 1 AND 12),
    year INT,
    category VARCHAR(100),
    limit_amount NUMERIC(15,2),
    spent_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TYPE bill_status_enum AS ENUM ('upcoming', 'paid', 'overdue');

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    biller_name VARCHAR(100),
    due_date DATE,
    amount_due NUMERIC(15,2),
    status bill_status_enum DEFAULT 'upcoming',
    auto_pay BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    program_name VARCHAR(100),
    points_balance INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TYPE alert_type_enum AS ENUM (
    'low_balance',
    'bill_due',
    'budget_exceeded'
);
CREATE TABLE Alerts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    type alert_type_enum NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO Alerts (user_id, type, message)
SELECT user_id,
       'low_balance',
       'Your account balance is below 1000'
FROM Accounts
WHERE balance < 1000;
INSERT INTO Alerts (user_id, type, message)
SELECT user_id,
       'budget_exceeded',
       'You have exceeded your budget for ' || category
FROM Budgets
WHERE spent_amount > limit_amount;
INSERT INTO Alerts (user_id, type, message)
SELECT user_id,
       'bill_due',
       'Your bill for ' || biller_name || ' is due soon.'
FROM Bills
WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
AND status = 'upcoming';
SELECT 
    DATE_TRUNC('month', txn_date) AS month,
    SUM(CASE WHEN txn_type = 'credit' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN txn_type = 'debit' THEN amount ELSE 0 END) AS total_expense,
    SUM(CASE WHEN txn_type = 'credit' THEN amount ELSE -amount END) AS net_cash_flow
FROM Transactions
GROUP BY month
ORDER BY month;
SELECT merchant,
       SUM(amount) AS total_spent
FROM Transactions
WHERE txn_type = 'debit'
GROUP BY merchant
ORDER BY total_spent DESC
LIMIT 5;
SELECT 
    AVG(monthly_expense) AS burn_rate
FROM (
    SELECT DATE_TRUNC('month', txn_date) AS month,
           SUM(amount) AS monthly_expense
    FROM Transactions
    WHERE txn_type = 'debit'
    GROUP BY month
) sub;
COPY (
    SELECT * FROM Transactions
) TO '/tmp/transactions_export.csv'
WITH CSV HEADER;
CREATE TABLE AdminLogs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES Users(id),
    action TEXT,
    target_type VARCHAR(50),
    target_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

