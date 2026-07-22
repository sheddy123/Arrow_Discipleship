using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiscipleUp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentXp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Xp",
                table: "StudentProgresses",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Xp",
                table: "StudentProgresses");
        }
    }
}
