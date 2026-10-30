package com.example.autojournal

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.ECDSASigner
import com.nimbusds.jose.jwk.Curve
import com.nimbusds.jose.jwk.ECKey
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.source.ImmutableJWKSet
import com.nimbusds.jose.proc.JWSVerificationKeySelector
import com.nimbusds.jose.proc.SecurityContext
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.nimbusds.jwt.proc.DefaultJWTProcessor
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.jwt.JwtClaimValidator
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.test.web.servlet.MockHttpServletRequestDsl
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.time.Instant
import java.util.Date
import java.util.UUID

/**
 * Supabase-like access tokens for tests (ADR 0015: tests never call Supabase). Tokens are ES256-signed
 * with a local key; the decoder validates them like the production one (signature, expiry, issuer,
 * audience `authenticated`), so the security configuration is exercised for real.
 */
object TestJwt {
    /** Matches `SUPABASE_URL` in application-test.yml. */
    const val ISSUER = "https://test.supabase.co/auth/v1"

    /** The user most tests act as. */
    val USER: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")

    val keyPair: KeyPair = newKeyPair()

    fun newKeyPair(): KeyPair = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()

    fun token(
        userId: UUID = USER,
        issuer: String = ISSUER,
        audience: String = "authenticated",
        expiresAt: Instant = Instant.now().plusSeconds(3600),
        signingKey: KeyPair = keyPair,
    ): String {
        val claims =
            JWTClaimsSet
                .Builder()
                .subject(userId.toString())
                .issuer(issuer)
                .audience(audience)
                .issueTime(Date.from(expiresAt.minusSeconds(3600)))
                .expirationTime(Date.from(expiresAt))
                .claim("role", "authenticated")
                .build()
        return SignedJWT(JWSHeader(JWSAlgorithm.ES256), claims)
            .apply { sign(ECDSASigner(signingKey.private as ECPrivateKey)) }
            .serialize()
    }
}

/** Sends the request as [userId] with a valid bearer token. */
fun MockHttpServletRequestDsl.signedInAs(userId: UUID = TestJwt.USER) {
    headers { setBearerAuth(TestJwt.token(userId)) }
}

/** Replaces the JWKS-based decoder so tests verify tokens with [TestJwt]'s key. */
@TestConfiguration(proxyBeanMethods = false)
class TestJwtConfiguration {
    @Bean
    fun jwtDecoder(): JwtDecoder {
        val jwk = ECKey.Builder(Curve.P_256, TestJwt.keyPair.public as ECPublicKey).build()
        val processor =
            DefaultJWTProcessor<SecurityContext>().apply {
                jwsKeySelector = JWSVerificationKeySelector(JWSAlgorithm.ES256, ImmutableJWKSet(JWKSet(jwk)))
            }
        return NimbusJwtDecoder(processor).apply {
            setJwtValidator(
                DelegatingOAuth2TokenValidator(
                    JwtValidators.createDefaultWithIssuer(TestJwt.ISSUER),
                    JwtClaimValidator<Collection<String>>("aud") { "authenticated" in it },
                ),
            )
        }
    }
}
