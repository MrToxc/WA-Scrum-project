<?php

namespace App\Helpers;

class PassphraseGenerator
{
    private static ?array $words = null;

    /**
     * Load word list from file (cached for the duration of the request).
     */
    #chatgpt code start
    private static function words(): array
    {
        if (self::$words === null) {
            $path = resource_path('data/czech_words.txt');
            self::$words = array_values(array_filter(
                array_map('trim', file($path)),
                fn(string $line) => $line !== ''
            ));
        }

        return self::$words;
    }
    #chatgpt code end

    /**
     * Generate a passphrase of $wordCount random Czech words separated by spaces.
     */
    public static function generate(int $wordCount = 5): string
    {
        $words = self::words();
        $keys = array_rand($words, $wordCount);
        $picked = [];

        foreach ((array) $keys as $key) {
            $picked[] = $words[$key];
        }

        return implode(' ', $picked);
    }
}
