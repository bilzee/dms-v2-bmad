import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; email?: string };
}) {
  const session = await auth();
  
  // Only redirect if explicitly accessing sign-in page (not when redirected due to auth error)
  const isDirectAccess = !searchParams.error && !searchParams.callbackUrl;
  if (session && isDirectAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to DMS v2
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Disaster Management System
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {searchParams.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Sign In Failed</p>
              <p className="text-sm mt-1">
                {searchParams.error === 'CredentialsSignin' 
                  ? 'Invalid email or password. Please check your credentials and try again.'
                  : searchParams.error
                }
              </p>
            </div>
          )}
          
          <form
            action={async (formData) => {
              "use server";
              await signIn("github", {
                redirectTo: searchParams.callbackUrl || '/',
              });
            }}
            className="mt-8 space-y-6"
          >
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with GitHub
            </button>
          </form>

          <form
            action={async (formData) => {
              "use server";
              let result;
              
              try {
                result = await signIn("credentials", {
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  redirectTo: searchParams.callbackUrl || '/',
                  redirect: false,
                });
              } catch (error) {
                // Handle NEXT_REDIRECT specifically - DON'T CATCH IT
                if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
                  throw error; // Re-throw to let Next.js handle the redirect
                }
                
                // Only catch actual authentication errors - redirect outside try-catch
              }
              
              // Handle authentication result outside try-catch to avoid NEXT_REDIRECT issues
              if (!result || result?.error) {
                const errorMessage = result?.error || 'Authentication failed. Please try again.';
                const email = formData.get("email") as string;
                redirect(`/auth/signin?error=${encodeURIComponent(errorMessage)}&email=${encodeURIComponent(email)}`);
                return;
              }
              
              // Success case - redirect WITHOUT try-catch wrapper
              const redirectUrl = searchParams.callbackUrl || '/';
              redirect(`${redirectUrl}?authSuccess=true`);
            }}
            className="mt-8 space-y-6"
          >
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={searchParams.email || ''} // Preserve email on error
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Sign in with Credentials
            </button>
            
            <div className="text-xs text-gray-600 text-center space-y-1">
              <p className="font-medium">Available Test Credentials:</p>
              <div className="grid grid-cols-1 gap-1 text-left bg-gray-50 p-3 rounded-md">
                <p><strong>Admin:</strong> admin@test.com / admin123</p>
                <p><strong>Assessor:</strong> assessor@test.com / assessor123</p>
                <p><strong>Responder:</strong> responder@test.com / responder123</p>
                <p><strong>Coordinator:</strong> coordinator@test.com / coordinator123</p>
                <p><strong>Verifier:</strong> verifier@test.com / verifier123</p>
                <p><strong>Donor:</strong> donor@test.com / donor123</p>
                <p><strong>Super User (All Roles):</strong> superuser@test.com / superuser123</p>
                <p><strong>Super User (Alt):</strong> supertest-alt@test.com / superuser123</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}