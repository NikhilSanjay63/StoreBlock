import { render, screen } from "@testing-library/react";
import FileUpload from "./components/FileUpload";

test("renders file upload component", () => {
  render(<FileUpload />);
  const uploadButton = screen.getByText(/Choose Files/i);
  expect(uploadButton).toBeInTheDocument();
});
