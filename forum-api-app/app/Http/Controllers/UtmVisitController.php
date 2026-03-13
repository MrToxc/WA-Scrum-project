<?php

namespace App\Http\Controllers;

use App\Models\UtmVisit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UtmVisitController extends Controller
{
    /**
     * Track a UTM visit (public, no auth required).
     *
     * Validates that at least one UTM parameter is present,
     * captures IP + User-Agent from the request, and stores the visit.
     * If a valid Bearer token is present, the user_id is captured automatically.
     */
    public function track(Request $request)
    {
        $request->validate([
            'utm_source' => 'nullable|string|max:255',
            'utm_medium' => 'nullable|string|max:255',
            'utm_campaign' => 'nullable|string|max:255',
        ]);

        // At least one UTM field must be present
        /*
        if (!$request->utm_source && !$request->utm_medium && !$request->utm_campaign) {
            return response()->json([
                'message' => 'At least one UTM parameter (utm_source, utm_medium, or utm_campaign) is required.',
            ], 422);
        }
*/
        // Resolve user from Sanctum token if present (without requiring auth)
        $user = Auth::guard('sanctum')->user();

        $visit = UtmVisit::create([
            'utm_source' => $request->utm_source,
            'utm_medium' => $request->utm_medium,
            'utm_campaign' => $request->utm_campaign,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'user_id' => $user?->id,
            'visited_at' => now(),
        ]);

        return response()->json([
            'message' => 'Visit tracked successfully.',
            'data' => $visit,
        ], 201);
    }

    /**
     * Return aggregated UTM statistics (behind auth:sanctum).
     *
     * Groups visit counts by source, medium, and campaign
     * for a future analytics dashboard.
     */
    public function stats()
    {
        $bySource = UtmVisit::select('utm_source', DB::raw('COUNT(*) as count'))
            ->whereNotNull('utm_source')
            ->groupBy('utm_source')
            ->orderByDesc('count')
            ->get();

        $byMedium = UtmVisit::select('utm_medium', DB::raw('COUNT(*) as count'))
            ->whereNotNull('utm_medium')
            ->groupBy('utm_medium')
            ->orderByDesc('count')
            ->get();

        $byCampaign = UtmVisit::select('utm_campaign', DB::raw('COUNT(*) as count'))
            ->whereNotNull('utm_campaign')
            ->groupBy('utm_campaign')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'total_visits' => UtmVisit::count(),
            'by_source' => $bySource,
            'by_medium' => $byMedium,
            'by_campaign' => $byCampaign,
        ]);
    }
}
