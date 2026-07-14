#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE trip_db;
    CREATE DATABASE booking_db;
    CREATE DATABASE admin_db;
    CREATE DATABASE analytics_db;
    CREATE DATABASE payment_db;
    CREATE DATABASE users_db;
EOSQL
