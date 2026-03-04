<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UtmVisit extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'ip_address',
        'user_agent',
        'user_id',
        'visited_at',
    ];

    protected $casts = [
        'visited_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
