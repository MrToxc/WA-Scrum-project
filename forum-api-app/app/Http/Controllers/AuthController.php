<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/register
     * Body: { "username": "some_unique_name" }
     *
     * Vytvoří usera a vrátí mu vygenerované heslo (tohle je jediný moment, kdy ho uvidí).
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:50', 'alpha_dash', 'unique:users,username'],
        ]);

        // vygenerujeme silné heslo
        $plainPassword = method_exists(Str::class, 'password')
            ? Str::password(20)
            : Str::random(20);

        // lookup otisk: deterministický (stejné heslo => stejný lookup),
        // ale bez APP_KEY nejde jednoduše zkoušet "duhové tabulky"
        $lookup = hash_hmac('sha256', $plainPassword, config('app.key'));

        // EXTRA POJISTKA: kdyby náhodou narazil lookup na existující (extrémně nepravděpodobné),
        // přegenerujeme heslo znovu
        while (User::where('password_lookup', $lookup)->exists()) {
            $plainPassword = method_exists(Str::class, 'password')
                ? Str::password(20)
                : Str::random(20);

            $lookup = hash_hmac('sha256', $plainPassword, config('app.key'));
        }

        $user = User::create([
            'username' => $data['username'],
            'password' => $plainPassword,      // automaticky se zahashuje díky casts()
            'password_lookup' => $lookup,
        ]);

        // token pro API
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'username' => $user->username,
            'password' => $plainPassword, // zobrazit jen při registraci
            'token' => $token,
        ], 201);
    }

    /**
     * POST /api/v1/auth/login
     * Body: { "password": "GENEROVANE_HESLO" }
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'max:255'],
        ]);

        $lookup = hash_hmac('sha256', $data['password'], config('app.key'));

        // najdeme usera jen podle hesla (přes lookup)
        $user = User::where('password_lookup', $lookup)->first();

        // a teprve potom ověříme skutečné heslo proti password hashi
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'credentials' => ['Invalid password.'],
            ]);
        }
        #smazat vsechny ostatni tokeny uzivatele
        $user->tokens()->delete();
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/logout (auth:sanctum)
     */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
        ]);
    }

}
