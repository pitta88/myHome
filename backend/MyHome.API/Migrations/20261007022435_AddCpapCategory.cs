using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyHome.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCpapCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Color", "Icon", "Name" },
                values: new object[] { 6, "purple", "😴", "CPAP" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6);
        }
    }
}
