using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiscipleUp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomBadgeCriteria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Criterion",
                table: "Badges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Threshold",
                table: "Badges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Criterion", "Threshold" },
                values: new object[] { 0, 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Criterion",
                table: "Badges");

            migrationBuilder.DropColumn(
                name: "Threshold",
                table: "Badges");
        }
    }
}
