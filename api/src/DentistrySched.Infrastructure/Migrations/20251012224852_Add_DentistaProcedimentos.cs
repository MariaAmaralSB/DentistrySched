using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DentistrySched.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_DentistaProcedimentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DentistaProcedimento");

            migrationBuilder.CreateTable(
                name: "DentistaProcedimentos",
                columns: table => new
                {
                    DentistaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProcedimentoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProcedimentoId1 = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentistaProcedimentos", x => new { x.DentistaId, x.ProcedimentoId });
                    table.ForeignKey(
                        name: "FK_DentistaProcedimentos_Dentistas_DentistaId",
                        column: x => x.DentistaId,
                        principalTable: "Dentistas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId",
                        column: x => x.ProcedimentoId,
                        principalTable: "Procedimentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId1",
                        column: x => x.ProcedimentoId1,
                        principalTable: "Procedimentos",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DentistaProcedimentos_ProcedimentoId",
                table: "DentistaProcedimentos",
                column: "ProcedimentoId");

            migrationBuilder.CreateIndex(
                name: "IX_DentistaProcedimentos_ProcedimentoId1",
                table: "DentistaProcedimentos",
                column: "ProcedimentoId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DentistaProcedimentos");

            migrationBuilder.CreateTable(
                name: "DentistaProcedimento",
                columns: table => new
                {
                    DentistaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProcedimentoId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentistaProcedimento", x => new { x.DentistaId, x.ProcedimentoId });
                    table.ForeignKey(
                        name: "FK_DentistaProcedimento_Dentistas_DentistaId",
                        column: x => x.DentistaId,
                        principalTable: "Dentistas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DentistaProcedimento_Procedimentos_ProcedimentoId",
                        column: x => x.ProcedimentoId,
                        principalTable: "Procedimentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DentistaProcedimento_ProcedimentoId",
                table: "DentistaProcedimento",
                column: "ProcedimentoId");
        }
    }
}
