import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get all reviews for this user
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, reviewer_id, profiles!reviewer_id(first_name, last_name)')
      .eq('reviewee_id', user_id);

    if (reviewsError) {
      return new Response(JSON.stringify({ error: reviewsError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get complaint count (complaints lower rating)
    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('id')
      .eq('reported_user_id', user_id)
      .eq('status', 'open');

    // Calculate average rating from reviews
    let averageRating = 5.0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = sum / reviews.length;
    }

    // Subtract 0.1 for each open complaint (max -1.0)
    const complaintPenalty = Math.min(complaints?.length || 0, 10) * 0.1;
    const finalRating = Math.max(averageRating - complaintPenalty, 1.0);

    return new Response(
      JSON.stringify({
        rating: parseFloat(finalRating.toFixed(1)),
        review_count: reviews?.length || 0,
        complaint_count: complaints?.length || 0,
        reviews: reviews || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
