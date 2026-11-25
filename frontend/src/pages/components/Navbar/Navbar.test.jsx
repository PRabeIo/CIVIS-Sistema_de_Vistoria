import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "./Navbar";

function renderNavbar(props) {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <Navbar {...props} />
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  it("mostra os links do tipo de usuário", () => {
    renderNavbar({ tipo: "admin" });
    expect(screen.getByText("Empreendimentos")).toBeInTheDocument();
    expect(screen.queryByText("Agendar Vistoria")).not.toBeInTheDocument();
  });

  it("Sair limpa token e usuário do localStorage", () => {
    localStorage.setItem("token", "abc");
    localStorage.setItem("usuario", JSON.stringify({ tipo: "cliente", id: 1 }));
    renderNavbar({});

    fireEvent.click(screen.getAllByText("Sair")[0]);

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("usuario")).toBeNull();
  });
});
