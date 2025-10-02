using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DentistrySched.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAgendaExcecoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgendaExcecoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DentistaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Data = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    FechadoDiaTodo = table.Column<bool>(type: "INTEGER", nullable: false),
                    AbrirManhaDe = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    AbrirManhaAte = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    AbrirTardeDe = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    AbrirTardeAte = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    Motivo = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgendaExcecoes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgendaExcecoes_DentistaId_Data",
                table: "AgendaExcecoes",
                columns: new[] { "DentistaId", "Data" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgendaExcecoes");
        }
    }
}
