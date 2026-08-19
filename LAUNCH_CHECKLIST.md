# Vendo — Public Beta Launch Checklist

- [ ] Production MongoDB configured and backed up.
- [ ] `AUTH_SECRET` set to a stable, long random value.
- [ ] Cloudinary account configured; new marketplace photos persist as CDN URLs.
- [ ] Vision AI provider has a production key/budget independent of temporary builder credits.
- [ ] `EXPO_PUBLIC_BACKEND_URL` points to the production HTTPS API.
- [ ] CORS restricted for any web deployment.
- [ ] Two-account ownership/security test passes.
- [ ] AI failure/retry test passes.
- [ ] Marketplace publish/search/detail/favorite/inquiry/report/sold/unpublish tests pass.
- [ ] Account deletion tested end-to-end.
- [ ] Privacy policy and Terms replaced with final legal/company details.
- [ ] Support/contact email added.
- [ ] Prohibited-items/moderation policy finalized.
- [ ] Final app icon/splash screenshots reviewed.
- [ ] EAS preview build tested on physical iPhone and Android device.
- [ ] App Store / Play Store metadata, screenshots and disclosures prepared.
- [ ] Production monitoring/crash reporting selected before wider rollout.
