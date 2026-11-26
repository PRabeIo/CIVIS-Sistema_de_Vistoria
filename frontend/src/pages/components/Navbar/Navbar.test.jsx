import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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

  it("Sair revoga a sessão no servidor e limpa o usuário local", () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem("usuario", JSON.stringify({ tipo: "cliente", id: 1 }));
    renderNavbar({});

    fireEvent.click(screen.getAllByText("Sair")[0]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/logout$/),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(localStorage.getItem("usuario")).toBeNull();
    vi.unstubAllGlobals();
  });
});
