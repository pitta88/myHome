using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyHome.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDexterCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 덱스터 predates this migration: it was created at runtime via
            // POST /api/categories, so Id 5 already exists in the dev and docker
            // databases. A plain InsertData would fail there on the primary key,
            // so insert only where the row is genuinely missing (a fresh database).
            migrationBuilder.Sql(
                "INSERT OR IGNORE INTO Categories (Id, Name, Icon, Color) " +
                "VALUES (5, '덱스터', '🐕', 'amber');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Deliberately empty. Up cannot tell whether it inserted the row or
            // skipped an existing one, and MaintenanceItems references Categories
            // with ON DELETE CASCADE — deleting Id 5 would take the 덱스터 items and
            // their logs with it. Leaving the row is the only non-destructive inverse.
        }
    }
}
