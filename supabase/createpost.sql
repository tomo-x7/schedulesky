CREATE
OR REPLACE FUNCTION createpost (
  post_at timestamptz,
  posttext text,
  facet jsonb,
  refreshtoken text,
  did text,
  pdsendpoint text,
  blob jsonb[],
  rid text[],
  alt text[]
)  RETURNS void AS $$
DECLARE
postid bigint;
BEGIN
insert into public.schedulesky_posts (post_at,text,did,endpoint,refreshtoken,facet)
 values (createpost.post_at,createpost.posttext,createpost.did,createpost.pdsendpoint,createpost.refreshtoken,createpost.facet)
 RETURNING id into postid;

FOR i IN 1..4 LOOP
	EXIT when createpost.rid[i] is null OR blob[i] is null;
	insert into public.schedulesky_images (rid,blob,alt,parent_post)
	 values (createpost.rid[i],createpost.blob[i],createpost.alt[i],postid);
END LOOP;

return;
END
$$ LANGUAGE plpgsql  set search_path = '';
