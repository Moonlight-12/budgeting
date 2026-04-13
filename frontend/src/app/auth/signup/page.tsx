import SignupForm from "../../../components/auth/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="flex justify-center items-center h-screen">
      <div className="bg-white p-5 rounded-md w-full max-w-sm">
        <SignupForm />
      </div>
    </main>
  );
}
