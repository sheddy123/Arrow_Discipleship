using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiscipleUp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScriptureMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScriptureMemories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    WeekId = table.Column<int>(type: "int", nullable: false),
                    MarkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScriptureMemories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScriptureMemories_AspNetUsers_StudentId",
                        column: x => x.StudentId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScriptureMemories_Weeks_WeekId",
                        column: x => x.WeekId,
                        principalTable: "Weeks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureMemories_StudentId_WeekId",
                table: "ScriptureMemories",
                columns: new[] { "StudentId", "WeekId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureMemories_WeekId",
                table: "ScriptureMemories",
                column: "WeekId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScriptureMemories");
        }
    }
}
