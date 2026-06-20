echo 'Apchpl1718s**' | sudo -S docker cp migrate.sql zj3fefchky6y4289cfyig0gl:/migrate.sql
echo 'Apchpl1718s**' | sudo -S docker exec zj3fefchky6y4289cfyig0gl psql -U postgres -d flowcommerce -f /migrate.sql
