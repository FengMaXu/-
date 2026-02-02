import pymysql
import sys


def test_connection():
    config = {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "447575",
        "database": "spider_baseball_1",
        "charset": "utf8mb4",
    }

    print(f"Testing connection to {config['host']}:{config['port']}...")
    print(f"User: {config['user']}")
    print(f"Database: {config['database']}")

    try:
        conn = pymysql.connect(**config)
        print("✅ Connection Successful!")

        with conn.cursor() as cursor:
            cursor.execute("SELECT DATABASE()")
            print(f"Current Database: {cursor.fetchone()[0]}")

            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"Found {len(tables)} tables.")
            if tables:
                print("First 5 tables:")
                for t in tables[:5]:
                    print(f"- {t[0]}")

        conn.close()
    except Exception as e:
        print(f"❌ Connection Failed: {e}")


if __name__ == "__main__":
    test_connection()
