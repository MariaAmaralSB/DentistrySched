using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DentistrySched.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_DentistaProcedimento_Link : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimentos_Dentistas_DentistaId",
                table: "DentistaProcedimentos");

            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId",
                table: "DentistaProcedimentos");

            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId1",
                table: "DentistaProcedimentos");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DentistaProcedimentos",
                table: "DentistaProcedimentos");

            migrationBuilder.RenameTable(
                name: "DentistaProcedimentos",
                newName: "DentistaProcedimento");

            migrationBuilder.RenameIndex(
                name: "IX_DentistaProcedimentos_ProcedimentoId1",
                table: "DentistaProcedimento",
                newName: "IX_DentistaProcedimento_ProcedimentoId1");

            migrationBuilder.RenameIndex(
                name: "IX_DentistaProcedimentos_ProcedimentoId",
                table: "DentistaProcedimento",
                newName: "IX_DentistaProcedimento_ProcedimentoId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DentistaProcedimento",
                table: "DentistaProcedimento",
                columns: new[] { "DentistaId", "ProcedimentoId" });

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimento_Dentistas_DentistaId",
                table: "DentistaProcedimento",
                column: "DentistaId",
                principalTable: "Dentistas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimento_Procedimentos_ProcedimentoId",
                table: "DentistaProcedimento",
                column: "ProcedimentoId",
                principalTable: "Procedimentos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimento_Procedimentos_ProcedimentoId1",
                table: "DentistaProcedimento",
                column: "ProcedimentoId1",
                principalTable: "Procedimentos",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimento_Dentistas_DentistaId",
                table: "DentistaProcedimento");

            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimento_Procedimentos_ProcedimentoId",
                table: "DentistaProcedimento");

            migrationBuilder.DropForeignKey(
                name: "FK_DentistaProcedimento_Procedimentos_ProcedimentoId1",
                table: "DentistaProcedimento");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DentistaProcedimento",
                table: "DentistaProcedimento");

            migrationBuilder.RenameTable(
                name: "DentistaProcedimento",
                newName: "DentistaProcedimentos");

            migrationBuilder.RenameIndex(
                name: "IX_DentistaProcedimento_ProcedimentoId1",
                table: "DentistaProcedimentos",
                newName: "IX_DentistaProcedimentos_ProcedimentoId1");

            migrationBuilder.RenameIndex(
                name: "IX_DentistaProcedimento_ProcedimentoId",
                table: "DentistaProcedimentos",
                newName: "IX_DentistaProcedimentos_ProcedimentoId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DentistaProcedimentos",
                table: "DentistaProcedimentos",
                columns: new[] { "DentistaId", "ProcedimentoId" });

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimentos_Dentistas_DentistaId",
                table: "DentistaProcedimentos",
                column: "DentistaId",
                principalTable: "Dentistas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId",
                table: "DentistaProcedimentos",
                column: "ProcedimentoId",
                principalTable: "Procedimentos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DentistaProcedimentos_Procedimentos_ProcedimentoId1",
                table: "DentistaProcedimentos",
                column: "ProcedimentoId1",
                principalTable: "Procedimentos",
                principalColumn: "Id");
        }
    }
}
