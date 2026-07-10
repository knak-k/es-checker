"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Nav, Navbar } from "react-bootstrap";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <Navbar sticky="top" className="border-bottom bg-body shadow-sm">
      <Container>
        <Navbar.Brand as={Link} href="/" className="fw-bold">
          <span className="badge bg-primary me-2">ES</span>
          ES添削ツール
        </Navbar.Brand>
        <Nav className="ms-auto">
          <Nav.Link as={Link} href="/" active={pathname === "/"}>
            AI添削
          </Nav.Link>
          <Nav.Link as={Link} href="/browser" active={pathname === "/browser"}>
            ブラウザ内AI
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}
