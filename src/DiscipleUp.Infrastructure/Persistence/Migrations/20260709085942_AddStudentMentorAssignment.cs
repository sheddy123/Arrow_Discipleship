using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiscipleUp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentMentorAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MentorId",
                table: "StudentProgresses",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentProgresses_MentorId",
                table: "StudentProgresses",
                column: "MentorId");

            migrationBuilder.AddForeignKey(
                name: "FK_StudentProgresses_AspNetUsers_MentorId",
                table: "StudentProgresses",
                column: "MentorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StudentProgresses_AspNetUsers_MentorId",
                table: "StudentProgresses");

            migrationBuilder.DropIndex(
                name: "IX_StudentProgresses_MentorId",
                table: "StudentProgresses");

            migrationBuilder.DropColumn(
                name: "MentorId",
                table: "StudentProgresses");
        }
    }
}
